import { describe, expect, it, vi } from 'vitest';

import { ApiError, request, walletApi } from '../../src/api';
import { ADDRESS } from '../utils/fixtures';

function respond(body: unknown, init: ResponseInit = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
        ...init,
      }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('request', () => {
  it('should return the parsed response body', async () => {
    respond({ data: [1, 2], meta: { cached: true, asOf: 1 } });

    await expect(request('/api/test')).resolves.toEqual({
      data: [1, 2],
      meta: { cached: true, asOf: 1 },
    });
  });

  it('should only send a JSON content type when there is a body', async () => {
    const fetch = respond({ data: null });

    await request('/api/a');
    await request('/api/b', { method: 'POST', body: '{}' });

    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({ accept: 'application/json' });
    expect(fetch.mock.calls[1]?.[1]?.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
    });
  });

  it('should raise an ApiError built from the error envelope', async () => {
    respond(
      { error: { code: 'RATE_LIMITED', message: 'Too many', details: { retryAfterSec: 7 } } },
      { status: 429 },
    );

    const error = await request('/api/test').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterSec: 7 });
  });

  it('should fall back to HTTP_ERROR when the error body is not JSON', async () => {
    respond('<html>Bad gateway</html>', { status: 502 });

    await expect(request('/api/test')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: 'Request failed with status 502',
    });
  });

  it('should report a NETWORK error when fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(request('/api/test')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });
});

describe('ApiError.retryable', () => {
  it.each([
    [0, true],
    [429, true],
    [500, true],
    [503, true],
    [400, false],
    [404, false],
  ])('should treat status %i as retryable=%s', (status, retryable) => {
    expect(new ApiError(status, 'X', 'x').retryable).toBe(retryable);
  });
});

describe('walletApi', () => {
  it('should request the overview for a window', async () => {
    const fetch = respond({ data: null });

    await walletApi.overview(ADDRESS, '30d');

    expect(fetch).toHaveBeenCalledWith(
      `/api/wallets/${ADDRESS}/overview?window=30d`,
      expect.anything(),
    );
  });

  it('should only include the fill filters that are set', async () => {
    const fetch = respond({ data: null });

    await walletApi.fills(ADDRESS, { limit: 100 });
    await walletApi.fills(ADDRESS, { limit: 50, before: 123, after: 0, coin: 'ETH' });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      `/api/wallets/${ADDRESS}/fills?limit=100`,
      `/api/wallets/${ADDRESS}/fills?limit=50&before=123&after=0&coin=ETH`,
    ]);
  });

  it('should post batch lookups as JSON', async () => {
    const fetch = respond({ data: null });

    await walletApi.batch([ADDRESS], '7d');

    expect(fetch).toHaveBeenCalledWith(
      '/api/wallets/batch',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ addresses: [ADDRESS], window: '7d' }),
      }),
    );
  });
});
