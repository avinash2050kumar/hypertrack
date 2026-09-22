import { afterEach, describe, expect, it, vi } from 'vitest';

import { HyperliquidClient } from '../../src/services/hyperliquid.js';
import { silentLogger, testConfig } from '../helpers/app.js';
import { ADDRESS, rawClearinghouse } from '../helpers/fixtures.js';
import { hyperliquidFetch, json } from '../helpers/upstream.js';

const META = [
  { universe: [{ name: 'BTC' }, { name: 'ETH' }] },
  [{ markPx: '65000.5' }, { markPx: null }],
];

function client(fetch: typeof globalThis.fetch, env: Record<string, string> = {}) {
  return new HyperliquidClient({ config: testConfig(env), logger: silentLogger, fetch });
}

describe('HyperliquidClient', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should post info requests as JSON to the configured URL', async () => {
    const fetch = hyperliquidFetch({ metaAndAssetCtxs: () => json(META) });

    await client(fetch, { HL_API_URL: 'https://hl.test/info' }).markPrices();

    expect(fetch).toHaveBeenCalledWith(
      'https://hl.test/info',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      }),
    );
  });

  it('should parse decimal strings and skip assets without a mark price', async () => {
    const fetch = hyperliquidFetch({ metaAndAssetCtxs: () => json(META) });

    const prices = await client(fetch).markPrices();

    expect(prices.value).toEqual({ BTC: 65000.5 });
  });

  it('should serve repeat requests from cache within the TTL', async () => {
    const fetch = hyperliquidFetch({ clearinghouseState: () => json(rawClearinghouse()) });
    const hl = client(fetch);

    const first = await hl.clearinghouseState(ADDRESS);
    const second = await hl.clearinghouseState(ADDRESS);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should include the dex only for non-main markets', async () => {
    const fetch = hyperliquidFetch({ clearinghouseState: () => json(rawClearinghouse()) });
    const hl = client(fetch);

    await hl.clearinghouseState(ADDRESS);
    await hl.clearinghouseState(ADDRESS, 'xyz');

    const bodies = fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies).toEqual([
      { type: 'clearinghouseState', user: ADDRESS },
      { type: 'clearinghouseState', user: ADDRESS, dex: 'xyz' },
    ]);
  });

  it('should map null perp dexes to the main market', async () => {
    const fetch = hyperliquidFetch({ perpDexs: () => json([null, { name: 'xyz' }]) });

    expect((await client(fetch).perpDexs()).value.names).toEqual(['', 'xyz']);
  });

  it('should retry server errors and succeed when the upstream recovers', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response('oops', { status: 502 }))
      .mockResolvedValueOnce(json(META));

    await expect(client(fetch).markPrices()).resolves.toMatchObject({ value: { BTC: 65000.5 } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should give up after three attempts with UPSTREAM_UNAVAILABLE', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError('fetch failed'));

    await expect(client(fetch).markPrices()).rejects.toMatchObject({
      status: 502,
      code: 'UPSTREAM_UNAVAILABLE',
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should surface upstream rate limiting without retrying', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '7' } }));

    await expect(client(fetch).markPrices()).rejects.toMatchObject({
      status: 503,
      code: 'UPSTREAM_RATE_LIMITED',
      details: { retryAfterSec: 7 },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should reject 4xx responses with a truncated upstream body', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('x'.repeat(500), { status: 422 }));

    const error: unknown = await client(fetch)
      .markPrices()
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'UPSTREAM_REJECTED', details: { upstreamStatus: 422 } });
    expect(JSON.stringify(error)).not.toContain('x'.repeat(201));
  });

  it('should reject responses with an unexpected shape', async () => {
    const fetch = hyperliquidFetch({ metaAndAssetCtxs: () => json({ surprise: true }) });

    await expect(client(fetch).markPrices()).rejects.toMatchObject({
      code: 'UPSTREAM_BAD_RESPONSE',
    });
  });

  it('should time out a hanging upstream with UPSTREAM_TIMEOUT', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const assertion = expect(client(fetch).markPrices()).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT',
    });
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should refuse to queue when the weight budget cannot recover in time', async () => {
    const fetch = hyperliquidFetch({ metaAndAssetCtxs: () => json(META) });
    const hl = client(fetch, { HL_WEIGHT_PER_MIN: '10', CACHE_TTL_META: '0' });

    await expect(hl.markPrices()).rejects.toMatchObject({ code: 'UPSTREAM_RATE_LIMITED' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
