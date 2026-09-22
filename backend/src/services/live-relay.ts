import WebSocket from 'ws';
import { z } from 'zod';

import {
  UPSTREAM_IDLE_DISCONNECT_MS,
  UPSTREAM_MAX_BACKOFF_MS,
  UPSTREAM_PING_INTERVAL_MS,
} from '../data/index.js';
import type { WalletSocketMessage } from '../domain/index.js';
import { AppError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { clearinghouseStateSchema, type RawClearinghouseState } from './hyperliquid.js';
import { toLiveState } from './normalize.js';

type Listener = (message: WalletSocketMessage) => void;

const upstreamMessageSchema = z.object({ channel: z.string(), data: z.unknown() });
const clearinghouseMessageSchema = z.object({
  user: z.string(),
  dex: z.string().optional(),
  clearinghouseState: clearinghouseStateSchema,
});

interface LiveRelayOptions {
  url: string;
  listDexes: () => Promise<string[]>;
  maxSubscriptions: number;
  logger: Logger;
}

// One upstream socket multiplexes every watched address; subscriptions are ref-counted per address,
// with one upstream subscription per perp market (main + HIP-3) that get merged before fan-out.
export class LiveRelay {
  private upstream: WebSocket | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly latest = new Map<string, Map<string, RawClearinghouseState>>();
  private dexes: string[] = [''];
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(private readonly options: LiveRelayOptions) {}

  get subscriptionCount(): number {
    return this.listeners.size;
  }

  subscribe(address: string, listener: Listener): () => void {
    const existing = this.listeners.get(address);
    if (!existing && this.listeners.size >= this.options.maxSubscriptions) {
      throw new AppError(
        503,
        'LIVE_CAPACITY',
        'Live updates are at capacity, falling back to polling',
      );
    }
    const set = existing ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(address, set);
    this.clearIdleTimer();

    if (!existing)
      void this.refreshDexes().then(() => this.sendSubscriptions('subscribe', address));
    this.ensureConnected();
    const snapshot = this.snapshot(address);
    if (snapshot) listener(snapshot);

    return () => this.unsubscribe(address, listener);
  }

  close(): void {
    this.listeners.clear();
    this.teardown();
  }

  private unsubscribe(address: string, listener: Listener): void {
    const set = this.listeners.get(address);
    if (!set) return;
    set.delete(listener);
    if (set.size) return;
    this.listeners.delete(address);
    this.latest.delete(address);
    this.sendSubscriptions('unsubscribe', address);
    if (!this.listeners.size) this.scheduleIdleDisconnect();
  }

  private ensureConnected(): void {
    if (this.upstream || this.reconnectTimer) return;
    const socket = new WebSocket(this.options.url);
    this.upstream = socket;
    socket.on('open', () => this.handleOpen());
    socket.on('message', (raw) => this.handleMessage(raw.toString()));
    socket.on('close', () => this.handleClose(socket));
    socket.on('error', (error) =>
      this.options.logger.warn({ err: error }, 'upstream websocket error'),
    );
  }

  private handleOpen(): void {
    this.reconnectAttempt = 0;
    this.options.logger.info({ addresses: this.listeners.size }, 'upstream websocket connected');
    void this.refreshDexes().then(() => {
      for (const address of this.listeners.keys()) this.sendSubscriptions('subscribe', address);
    });
    this.pingTimer = setInterval(() => this.send({ method: 'ping' }), UPSTREAM_PING_INTERVAL_MS);
    this.broadcastAll({ type: 'status', status: 'connected' });
  }

  private handleClose(socket: WebSocket): void {
    if (this.upstream !== socket) return;
    this.upstream = null;
    this.stopPing();
    if (!this.listeners.size) return;
    const delay = Math.min(UPSTREAM_MAX_BACKOFF_MS, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.options.logger.warn(
      { delay, attempt: this.reconnectAttempt },
      'upstream websocket dropped, reconnecting',
    );
    this.broadcastAll({ type: 'status', status: 'reconnecting' });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listeners.size) this.ensureConnected();
    }, delay);
  }

  private handleMessage(text: string): void {
    const envelope = upstreamMessageSchema.safeParse(safeJson(text));
    if (!envelope.success || envelope.data.channel !== 'clearinghouseState') return;
    const message = clearinghouseMessageSchema.safeParse(envelope.data.data);
    if (!message.success) {
      this.options.logger.warn(
        { issues: message.error.issues.slice(0, 3) },
        'unexpected upstream payload',
      );
      return;
    }
    const address = message.data.user.toLowerCase();
    if (!this.listeners.has(address)) return;
    const states = this.latest.get(address) ?? new Map<string, RawClearinghouseState>();
    states.set(message.data.dex ?? '', message.data.clearinghouseState);
    this.latest.set(address, states);
    const snapshot = this.snapshot(address);
    if (snapshot) this.broadcast(address, snapshot);
  }

  // Waits until every market has reported once so positions don't flicker in one market at a time.
  private snapshot(address: string): WalletSocketMessage | null {
    const states = this.latest.get(address);
    if (!states || this.dexes.some((dex) => !states.has(dex))) return null;
    return { type: 'snapshot', data: toLiveState(address, [...states.values()]) };
  }

  private async refreshDexes(): Promise<void> {
    try {
      this.dexes = await this.options.listDexes();
    } catch (error) {
      this.options.logger.warn(
        { err: error },
        'could not list perp markets, using main market only',
      );
    }
  }

  private sendSubscriptions(method: 'subscribe' | 'unsubscribe', address: string): void {
    for (const dex of this.dexes) {
      this.send({ method, subscription: { type: 'clearinghouseState', user: address, dex } });
    }
  }

  private send(payload: object): void {
    if (this.upstream?.readyState === WebSocket.OPEN) this.upstream.send(JSON.stringify(payload));
  }

  private broadcast(address: string, message: WalletSocketMessage): void {
    for (const listener of this.listeners.get(address) ?? []) listener(message);
  }

  private broadcastAll(message: WalletSocketMessage): void {
    for (const address of this.listeners.keys()) this.broadcast(address, message);
  }

  private scheduleIdleDisconnect(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (!this.listeners.size) this.teardown();
    }, UPSTREAM_IDLE_DISCONNECT_MS);
    this.idleTimer.unref();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private teardown(): void {
    this.clearIdleTimer();
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.upstream;
    this.upstream = null;
    socket?.close();
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
