import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket, { WebSocketServer } from 'ws';

import { LiveRelay } from '../../src/services/live-relay.js';
import { attachLiveSocket } from '../../src/services/live-socket.js';
import { silentLogger } from './app.js';
import { rawClearinghouse } from './fixtures.js';

function portOf(address: string | AddressInfo | null): number {
  if (address && typeof address === 'object') return address.port;
  throw new Error('server is not listening on a TCP port');
}

export async function waitFor<T>(read: () => T | undefined, timeoutMs = 2_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = read();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error('timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export class FakeUpstream {
  readonly received: Record<string, unknown>[] = [];
  private readonly wss: WebSocketServer;

  private constructor(wss: WebSocketServer) {
    this.wss = wss;
    wss.on('connection', (socket) => {
      socket.on('message', (raw) => this.received.push(JSON.parse(raw.toString())));
    });
  }

  static async start(): Promise<FakeUpstream> {
    const wss = new WebSocketServer({ port: 0 });
    await once(wss, 'listening');
    return new FakeUpstream(wss);
  }

  get url(): string {
    return `ws://127.0.0.1:${portOf(this.wss.address())}`;
  }

  subscriptions(method: 'subscribe' | 'unsubscribe') {
    return this.received.filter((message) => message.method === method);
  }

  push(user: string, accountValue = 1_000): void {
    const payload = JSON.stringify({
      channel: 'clearinghouseState',
      data: {
        user,
        clearinghouseState: rawClearinghouse(
          [{ coin: 'BTC', szi: 1, value: 110, pnl: 10 }],
          accountValue,
        ),
      },
    });
    for (const client of this.wss.clients) client.send(payload);
  }

  dropConnections(): void {
    for (const client of this.wss.clients) client.terminate();
  }

  async close(): Promise<void> {
    this.dropConnections();
    await new Promise((resolve) => this.wss.close(resolve));
  }
}

export interface LiveServer {
  url: string;
  relay: LiveRelay;
  close: () => Promise<void>;
}

export async function startLiveServer(
  upstreamUrl: string,
  maxSubscriptions = 10,
): Promise<LiveServer> {
  const relay = new LiveRelay({
    url: upstreamUrl,
    listDexes: async () => [''],
    maxSubscriptions,
    logger: silentLogger,
  });
  const server: Server = createServer((_req, res) => res.writeHead(404).end());
  const detach = attachLiveSocket(server, relay, silentLogger);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    url: `ws://127.0.0.1:${portOf(server.address())}`,
    relay,
    close: async () => {
      detach();
      relay.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export interface TestClient {
  socket: WebSocket;
  messages: Record<string, unknown>[];
}

export async function connect(url: string): Promise<TestClient> {
  const socket = new WebSocket(url);
  const messages: Record<string, unknown>[] = [];
  socket.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
  await once(socket, 'open');
  return { socket, messages };
}

export async function rejectedStatus(url: string): Promise<number> {
  const socket = new WebSocket(url);
  const [, response] = await once(socket, 'unexpected-response');
  return response.statusCode;
}
