import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { LIVE_ENABLED, walletKeys, wsUrl } from '../api';
import { SOCKET_MAX_BACKOFF_MS, type SocketStatus } from '../data';
import {
  applyLiveState,
  type ApiResponse,
  type LiveWalletState,
  type Position,
  type WalletOverview,
  type WalletSocketMessage,
} from '../domain';

function parseMessage(raw: unknown): WalletSocketMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mergeLiveState(client: QueryClient, address: string, live: LiveWalletState): void {
  client.setQueriesData<ApiResponse<WalletOverview>>(
    { queryKey: walletKeys.overviews(address) },
    (old) =>
      old ? { data: applyLiveState(old.data, live), meta: { cached: false, asOf: live.at } } : old,
  );
  client.setQueryData<ApiResponse<Position[]>>(walletKeys.positions(address), (old) =>
    old ? { data: live.positions, meta: { cached: false, asOf: live.at } } : old,
  );
}

export function useWalletSocket(address: string): {
  status: SocketStatus;
  lastUpdate: number | null;
} {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SocketStatus>(LIVE_ENABLED ? 'connecting' : 'unavailable');
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    if (!LIVE_ENABLED) return;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let stopped = false;

    const handleMessage = (message: WalletSocketMessage) => {
      if (message.type === 'snapshot') {
        attempt = 0;
        setStatus('live');
        setLastUpdate(message.data.at);
        mergeLiveState(queryClient, address, message.data);
      } else if (message.type === 'status') {
        setStatus(message.status === 'connected' ? 'live' : 'reconnecting');
      } else {
        stopped = true;
        setStatus('unavailable');
      }
    };

    const connect = () => {
      setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
      socket = new WebSocket(wsUrl(`/ws/wallet/${address}`));
      socket.onmessage = (event) => {
        const message = parseMessage(event.data);
        if (message) handleMessage(message);
      };
      socket.onclose = () => {
        if (stopped) return;
        setStatus('reconnecting');
        retryTimer = setTimeout(connect, Math.min(SOCKET_MAX_BACKOFF_MS, 1000 * 2 ** attempt));
        attempt += 1;
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, [address, queryClient]);

  return { status, lastUpdate };
}
