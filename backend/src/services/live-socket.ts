import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';

import { CLIENT_HEARTBEAT_MS, LIVE_SOCKET_PATH } from '../data/index.js';
import { parseAddress, type WalletSocketMessage } from '../domain/index.js';
import { toAppError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import type { LiveRelay } from './live-relay.js';

interface Client {
  socket: WebSocket;
  alive: boolean;
}

function send(socket: WebSocket, message: WalletSocketMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

export function attachLiveSocket(server: Server, relay: LiveRelay, logger: Logger): () => void {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<Client>();

  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.alive) {
        client.socket.terminate();
        continue;
      }
      client.alive = false;
      client.socket.ping();
    }
  }, CLIENT_HEARTBEAT_MS);

  function handleConnection(socket: WebSocket, address: string): void {
    const client: Client = { socket, alive: true };
    clients.add(client);
    socket.on('pong', () => {
      client.alive = true;
    });

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = relay.subscribe(address, (message) => send(socket, message));
    } catch (error) {
      send(socket, { type: 'error', error: toAppError(error).toPayload() });
      socket.close(1013, 'capacity');
    }

    socket.on('close', () => {
      clients.delete(client);
      unsubscribe?.();
    });
  }

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const match = LIVE_SOCKET_PATH.exec(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (!match?.[1]) return rejectUpgrade(socket, 404, 'Not Found');
    const address = parseAddress(decodeURIComponent(match[1]));
    if (!address) return rejectUpgrade(socket, 400, 'Bad Request');
    wss.handleUpgrade(req, socket, head, (ws) => handleConnection(ws, address));
  });

  logger.debug('live websocket endpoint attached at /ws/wallet/:address');

  return () => {
    clearInterval(heartbeat);
    for (const client of clients) client.socket.terminate();
    wss.close();
  };
}
