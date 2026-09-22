import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ADDRESS, OTHER_ADDRESS } from '../helpers/fixtures.js';
import {
  connect,
  FakeUpstream,
  rejectedStatus,
  startLiveServer,
  waitFor,
  type LiveServer,
  type TestClient,
} from '../helpers/sockets.js';

describe('live wallet WebSocket', () => {
  let upstream: FakeUpstream;
  let live: LiveServer;
  const clients: TestClient[] = [];

  async function open(address = ADDRESS): Promise<TestClient> {
    const client = await connect(`${live.url}/ws/wallet/${address}`);
    clients.push(client);
    return client;
  }

  beforeEach(async () => {
    upstream = await FakeUpstream.start();
    live = await startLiveServer(upstream.url);
  });

  afterEach(async () => {
    for (const { socket } of clients.splice(0)) socket.terminate();
    await live.close();
    await upstream.close();
  });

  it('should reject upgrades on unknown paths with 404', async () => {
    expect(await rejectedStatus(`${live.url}/ws/unknown`)).toBe(404);
  });

  it('should reject malformed wallet addresses with 400', async () => {
    expect(await rejectedStatus(`${live.url}/ws/wallet/0x123`)).toBe(400);
  });

  it('should subscribe upstream using the lowercased address', async () => {
    await open(ADDRESS.toUpperCase().replace('0X', '0x'));

    const [subscription] = await waitFor(() => {
      const found = upstream.subscriptions('subscribe');
      return found.length ? found : undefined;
    });

    expect(subscription).toEqual({
      method: 'subscribe',
      subscription: { type: 'clearinghouseState', user: ADDRESS, dex: '' },
    });
  });

  it('should announce the connection and stream wallet snapshots', async () => {
    const client = await open();
    await waitFor(() => upstream.subscriptions('subscribe')[0]);

    upstream.push(ADDRESS, 1_250);
    const snapshot = await waitFor(() => client.messages.find((m) => m.type === 'snapshot'));

    expect(client.messages[0]).toEqual({ type: 'status', status: 'connected' });
    expect(snapshot).toMatchObject({
      type: 'snapshot',
      data: {
        address: ADDRESS,
        perpAccountValue: 1_250,
        positions: [expect.objectContaining({ coin: 'BTC', szi: 1, unrealizedPnl: 10 })],
      },
    });
  });

  it('should only deliver snapshots to clients watching that wallet', async () => {
    const watcher = await open(ADDRESS);
    const bystander = await open(OTHER_ADDRESS);
    await waitFor(() => (upstream.subscriptions('subscribe').length === 2 ? true : undefined));

    upstream.push(ADDRESS);
    await waitFor(() => watcher.messages.find((m) => m.type === 'snapshot'));

    expect(bystander.messages.some((m) => m.type === 'snapshot')).toBe(false);
  });

  it('should share one upstream subscription between viewers of the same wallet', async () => {
    const first = await open();
    await waitFor(() => upstream.subscriptions('subscribe')[0]);
    await open();
    upstream.push(ADDRESS);
    await waitFor(() => first.messages.find((m) => m.type === 'snapshot'));

    expect(upstream.subscriptions('subscribe')).toHaveLength(1);
    expect(live.relay.subscriptionCount).toBe(1);
  });

  it('should send the latest snapshot immediately to a late joiner', async () => {
    const first = await open();
    await waitFor(() => upstream.subscriptions('subscribe')[0]);
    upstream.push(ADDRESS, 1_500);
    await waitFor(() => first.messages.find((m) => m.type === 'snapshot'));

    const late = await open();
    const snapshot = await waitFor(() => late.messages.find((m) => m.type === 'snapshot'));

    expect(snapshot).toMatchObject({ data: { perpAccountValue: 1_500 } });
  });

  it('should unsubscribe upstream once the last viewer leaves', async () => {
    const client = await open();
    await waitFor(() => upstream.subscriptions('subscribe')[0]);

    client.socket.close();
    const [unsubscribe] = await waitFor(() => {
      const found = upstream.subscriptions('unsubscribe');
      return found.length ? found : undefined;
    });

    expect(unsubscribe).toMatchObject({ subscription: { user: ADDRESS } });
    expect(live.relay.subscriptionCount).toBe(0);
  });

  it('should tell clients it is reconnecting when the upstream drops', async () => {
    const client = await open();
    await waitFor(() => upstream.subscriptions('subscribe')[0]);

    upstream.dropConnections();

    expect(await waitFor(() => client.messages.find((m) => m.status === 'reconnecting'))).toEqual({
      type: 'status',
      status: 'reconnecting',
    });
  });

  it('should ignore malformed upstream messages', async () => {
    const client = await open();
    await waitFor(() => upstream.subscriptions('subscribe')[0]);

    upstream.push('not-a-wallet');
    upstream.push(ADDRESS);
    await waitFor(() => client.messages.find((m) => m.type === 'snapshot'));

    expect(client.messages.filter((m) => m.type === 'snapshot')).toHaveLength(1);
  });
});

describe('live wallet WebSocket capacity', () => {
  it('should refuse new wallets beyond the upstream subscription cap', async () => {
    const upstream = await FakeUpstream.start();
    const live = await startLiveServer(upstream.url, 1);
    const first = await connect(`${live.url}/ws/wallet/${ADDRESS}`);
    const second = await connect(`${live.url}/ws/wallet/${OTHER_ADDRESS}`);
    const closed = new Promise<number>((resolve) => second.socket.on('close', resolve));

    const code = await closed;

    expect(second.messages).toContainEqual({
      type: 'error',
      error: {
        code: 'LIVE_CAPACITY',
        message: 'Live updates are at capacity, falling back to polling',
      },
    });
    expect(code).toBe(1013);
    expect(first.socket.readyState).toBe(first.socket.OPEN);

    first.socket.terminate();
    await live.close();
    await upstream.close();
  });
});
