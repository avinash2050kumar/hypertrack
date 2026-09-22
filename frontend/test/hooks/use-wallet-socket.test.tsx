import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { walletKeys } from '../../src/api';
import type { ApiResponse, Position, WalletOverview } from '../../src/domain';
import { useWalletSocket } from '../../src/hooks';
import { ADDRESS, makeLiveState, makeOverview, makePosition } from '../utils/fixtures';
import { createTestQueryClient } from '../utils/render';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  static latest(): MockWebSocket {
    const socket = MockWebSocket.instances.at(-1);
    if (!socket) throw new Error('no socket was opened');
    return socket;
  }

  receive(message: unknown) {
    act(() =>
      this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) }),
    );
  }

  drop() {
    act(() => this.onclose?.());
  }

  close() {
    this.closed = true;
  }
}

function setup() {
  const client = createTestQueryClient();
  client.setQueryData<ApiResponse<WalletOverview>>(walletKeys.overview(ADDRESS, '7d'), {
    data: makeOverview(),
    meta: { cached: false, asOf: 1 },
  });
  client.setQueryData<ApiResponse<Position[]>>(walletKeys.positions(ADDRESS), {
    data: [],
    meta: { cached: false, asOf: 1 },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useWalletSocket(ADDRESS), { wrapper }) };
}

describe('useWalletSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should connect to the wallet channel and start as connecting', () => {
    const { result } = setup();

    expect(MockWebSocket.latest().url).toBe(`ws://${window.location.host}/ws/wallet/${ADDRESS}`);
    expect(result.current.status).toBe('connecting');
  });

  it('should go live and merge snapshots into cached queries', () => {
    const { result, client } = setup();
    const live = makeLiveState({
      perpAccountValue: 1_200,
      positions: [makePosition({ coin: 'SOL' })],
    });

    MockWebSocket.latest().receive({ type: 'snapshot', data: live });

    expect(result.current).toEqual({ status: 'live', lastUpdate: live.at });
    const overview = client.getQueryData<ApiResponse<WalletOverview>>(
      walletKeys.overview(ADDRESS, '7d'),
    );
    expect(overview?.data.account.accountValue).toBe(1_700);
    expect(overview?.meta).toEqual({ cached: false, asOf: live.at });
    expect(
      client.getQueryData<ApiResponse<Position[]>>(walletKeys.positions(ADDRESS))?.data,
    ).toEqual(live.positions);
  });

  it('should reflect upstream status changes', () => {
    const { result } = setup();

    MockWebSocket.latest().receive({ type: 'status', status: 'reconnecting' });
    expect(result.current.status).toBe('reconnecting');

    MockWebSocket.latest().receive({ type: 'status', status: 'connected' });
    expect(result.current.status).toBe('live');
  });

  it('should fall back to polling and stop retrying on a server error', () => {
    const { result } = setup();

    MockWebSocket.latest().receive({
      type: 'error',
      error: { code: 'LIVE_CAPACITY', message: 'full' },
    });
    MockWebSocket.latest().drop();
    act(() => vi.advanceTimersByTime(60_000));

    expect(result.current.status).toBe('unavailable');
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('should ignore malformed messages', () => {
    const { result } = setup();

    MockWebSocket.latest().receive('not json');

    expect(result.current.status).toBe('connecting');
  });

  it('should reconnect with exponential backoff', () => {
    const { result } = setup();

    MockWebSocket.latest().drop();
    expect(result.current.status).toBe('reconnecting');
    act(() => vi.advanceTimersByTime(999));
    expect(MockWebSocket.instances).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(MockWebSocket.instances).toHaveLength(2);

    MockWebSocket.latest().drop();
    act(() => vi.advanceTimersByTime(1_999));
    expect(MockWebSocket.instances).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1));
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('should cap the reconnect delay at 30 seconds', () => {
    setup();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      MockWebSocket.latest().drop();
      act(() => vi.advanceTimersByTime(30_000));
    }

    expect(MockWebSocket.instances).toHaveLength(9);
  });

  it('should reset the backoff after a successful snapshot', () => {
    setup();
    MockWebSocket.latest().drop();
    act(() => vi.advanceTimersByTime(1_000));
    MockWebSocket.latest().drop();
    act(() => vi.advanceTimersByTime(2_000));

    MockWebSocket.latest().receive({ type: 'snapshot', data: makeLiveState() });
    MockWebSocket.latest().drop();
    act(() => vi.advanceTimersByTime(1_000));

    expect(MockWebSocket.instances).toHaveLength(4);
  });

  it('should close the socket and cancel retries on unmount', () => {
    const { unmount } = setup();
    const socket = MockWebSocket.latest();

    unmount();
    act(() => vi.advanceTimersByTime(60_000));

    expect(socket.closed).toBe(true);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
