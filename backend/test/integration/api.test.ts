import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { buildTestApp } from '../helpers/app.js';
import { ADDRESS, OTHER_ADDRESS } from '../helpers/fixtures.js';
import { fakeHyperliquid, json } from '../helpers/upstream.js';

const EMPTY_META = { cached: false, asOf: 1 };

describe('GET /api/health', () => {
  it('should report status, uptime and live subscriptions', async () => {
    const { app } = buildTestApp({ liveSubscriptions: () => 3 });

    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.data).toMatchObject({ status: 'ok', liveSubscriptions: 3 });
    expect(response.body.data.uptimeSec).toEqual(expect.any(Number));
  });
});

describe('GET /api/wallets/:address/positions', () => {
  it('should return normalised positions from Hyperliquid', async () => {
    const { app } = buildTestApp({ fetch: fakeHyperliquid() });

    const response = await request(app).get(`/api/wallets/${ADDRESS}/positions`).expect(200);

    expect(response.body.data).toEqual([
      expect.objectContaining({
        coin: 'BTC',
        side: 'long',
        szi: 2,
        size: 2,
        entryPx: 100,
        markPx: 110,
        unrealizedPnl: 20,
        leverage: 5,
        leverageType: 'cross',
      }),
    ]);
    expect(response.body.meta).toEqual({ cached: false, asOf: expect.any(Number) });
  });

  it('should mark a repeated request as cached', async () => {
    const { app } = buildTestApp({ fetch: fakeHyperliquid() });

    await request(app).get(`/api/wallets/${ADDRESS}/positions`);
    const response = await request(app).get(`/api/wallets/${ADDRESS}/positions`).expect(200);

    expect(response.body.meta.cached).toBe(true);
  });

  it('should treat addresses case-insensitively', async () => {
    const { app, wallets } = buildTestApp();
    const positions = vi
      .spyOn(wallets, 'positions')
      .mockResolvedValue({ data: [], meta: EMPTY_META });

    await request(app)
      .get(`/api/wallets/${ADDRESS.toUpperCase().replace('0X', '0x')}/positions`)
      .expect(200);

    expect(positions).toHaveBeenCalledWith(ADDRESS);
  });

  it('should reject a malformed address with INVALID_ADDRESS', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/wallets/0x123/positions').expect(400);

    expect(response.body.error).toMatchObject({
      code: 'INVALID_ADDRESS',
      message: 'Address must be 0x followed by 40 hex characters',
    });
  });

  it('should return 502 when Hyperliquid is unreachable', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError('fetch failed'));
    const { app } = buildTestApp({ fetch });

    const response = await request(app).get(`/api/wallets/${ADDRESS}/positions`).expect(502);

    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('should return 503 with retry details when Hyperliquid rate limits us', async () => {
    const fetch = fakeHyperliquid({
      perpDexs: () => new Response('', { status: 429, headers: { 'retry-after': '9' } }),
    });
    const { app } = buildTestApp({ fetch });

    const response = await request(app).get(`/api/wallets/${ADDRESS}/positions`).expect(503);

    expect(response.body.error).toMatchObject({
      code: 'UPSTREAM_RATE_LIMITED',
      details: { retryAfterSec: 9 },
    });
  });
});

describe.each([
  ['overview', 'overview'],
  ['performance', 'performance'],
  ['position-history', 'positionHistory'],
  ['pnl-history', 'pnlHistory'],
] as const)('GET /api/wallets/:address/%s', (path, method) => {
  it('should respond with data and meta for the requested window', async () => {
    const { app, wallets } = buildTestApp({ fetch: fakeHyperliquid() });
    const spy = vi.spyOn(wallets, method);

    const response = await request(app)
      .get(`/api/wallets/${ADDRESS}/${path}?window=30d`)
      .expect(200);

    expect(spy).toHaveBeenCalledWith(ADDRESS, '30d');
    expect(response.body).toEqual({
      data: expect.any(Object),
      meta: { cached: expect.any(Boolean), asOf: expect.any(Number) },
    });
  });

  it('should default to the 7d window', async () => {
    const { app, wallets } = buildTestApp({ fetch: fakeHyperliquid() });
    const spy = vi.spyOn(wallets, method);

    await request(app).get(`/api/wallets/${ADDRESS}/${path}`).expect(200);

    expect(spy).toHaveBeenCalledWith(ADDRESS, '7d');
  });

  it('should reject an unknown window', async () => {
    const { app, wallets } = buildTestApp();
    const spy = vi.spyOn(wallets, method);

    const response = await request(app)
      .get(`/api/wallets/${ADDRESS}/${path}?window=1y`)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('GET /api/wallets/:address/fills', () => {
  it('should forward parsed paging and coin filters', async () => {
    const { app, wallets } = buildTestApp();
    const fills = vi.spyOn(wallets, 'fills').mockResolvedValue({
      data: { fills: [], nextBefore: null },
      meta: EMPTY_META,
    });

    await request(app)
      .get(`/api/wallets/${ADDRESS}/fills`)
      .query({ limit: 50, before: 1_700_000_000_000, coin: 'ETH' })
      .expect(200);

    expect(fills).toHaveBeenCalledWith(ADDRESS, {
      limit: 50,
      before: 1_700_000_000_000,
      coin: 'ETH',
    });
  });

  it.each(['limit=0', 'limit=501', 'limit=abc', 'before=-5'])(
    'should reject the invalid query %s',
    async (query) => {
      const { app } = buildTestApp();

      const response = await request(app).get(`/api/wallets/${ADDRESS}/fills?${query}`).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    },
  );
});

describe('POST /api/wallets/batch', () => {
  it('should summarise every wallet in one request', async () => {
    const { app } = buildTestApp({ fetch: fakeHyperliquid() });

    const response = await request(app)
      .post('/api/wallets/batch')
      .send({ addresses: [ADDRESS, OTHER_ADDRESS], window: '24h' })
      .expect(200);

    expect(response.body.data.window).toBe('24h');
    expect(response.body.data.results).toEqual([
      expect.objectContaining({ address: ADDRESS, ok: true }),
      expect.objectContaining({ address: OTHER_ADDRESS, ok: true }),
    ]);
    expect(response.body.data.results[0].summary).toMatchObject({
      accountValue: 1100,
      openPositions: 1,
      pnl24h: 100,
    });
  });

  it('should deduplicate addresses regardless of case or whitespace', async () => {
    const { app } = buildTestApp({ fetch: fakeHyperliquid() });

    const response = await request(app)
      .post('/api/wallets/batch')
      .send({ addresses: [ADDRESS, ` ${ADDRESS.toUpperCase().replace('0X', '0x')} `] })
      .expect(200);

    expect(response.body.data.results).toHaveLength(1);
  });

  it('should report invalid entries without failing the whole batch', async () => {
    const { app } = buildTestApp({ fetch: fakeHyperliquid() });

    const response = await request(app)
      .post('/api/wallets/batch')
      .send({ addresses: [ADDRESS, 'not-an-address'] })
      .expect(200);

    expect(response.body.data.results).toEqual([
      expect.objectContaining({ address: ADDRESS, ok: true }),
      {
        address: 'not-an-address',
        ok: false,
        error: { code: 'INVALID_ADDRESS', message: 'Not a valid Hyperliquid address' },
      },
    ]);
  });

  it('should isolate upstream failures to the affected wallet', async () => {
    const fetch = fakeHyperliquid({
      portfolio: (body) =>
        body.user === OTHER_ADDRESS
          ? new Response('bad', { status: 400 })
          : fakeHyperliquid()('', { body: JSON.stringify(body) }),
    });
    const { app } = buildTestApp({ fetch });

    const response = await request(app)
      .post('/api/wallets/batch')
      .send({ addresses: [ADDRESS, OTHER_ADDRESS] })
      .expect(200);

    const [ok, failed] = response.body.data.results;
    expect(ok).toMatchObject({ ok: true });
    expect(failed).toMatchObject({ ok: false, error: { code: 'UPSTREAM_REJECTED' } });
  });

  it.each<[string, object]>([
    ['an empty list', { addresses: [] }],
    ['more than 25 addresses', { addresses: Array.from({ length: 26 }, () => ADDRESS) }],
    ['a string instead of a list', { addresses: ADDRESS }],
    ['a missing list', {}],
    ['an unknown window', { addresses: [ADDRESS], window: 'forever' }],
  ])('should reject %s', async (_case, body) => {
    const { app } = buildTestApp();

    const response = await request(app).post('/api/wallets/batch').send(body).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('should reject malformed JSON with INVALID_JSON', async () => {
    const { app } = buildTestApp();

    const response = await request(app)
      .post('/api/wallets/batch')
      .set('content-type', 'application/json')
      .send('{"addresses": [')
      .expect(400);

    expect(response.body.error).toEqual({
      code: 'INVALID_JSON',
      message: 'Request body is not valid JSON',
    });
  });
});

describe('unknown routes', () => {
  it('should return a 404 in the standard error envelope', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/nope').expect(404);

    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'No route for GET /api/nope' },
    });
  });

  it('should not treat GET on the batch endpoint as a wallet lookup', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/wallets/batch').expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('request ids', () => {
  it('should echo a client-supplied request id', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/health').set('x-request-id', 'trace-123');

    expect(response.headers['x-request-id']).toBe('trace-123');
  });

  it('should generate a UUID when none is supplied', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/health');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('should replace request ids longer than 128 characters', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/health').set('x-request-id', 'a'.repeat(129));

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('upstream integration', () => {
  it('should send the wallet address to Hyperliquid in lowercase', async () => {
    const fetch = fakeHyperliquid({ perpDexs: () => json([null]) });
    const { app } = buildTestApp({ fetch });

    await request(app).get(`/api/wallets/${ADDRESS.toUpperCase().replace('0X', '0x')}/positions`);

    const users = fetch.mock.calls
      .map(([, init]) => JSON.parse(String(init?.body)).user)
      .filter(Boolean);
    expect(new Set(users)).toEqual(new Set([ADDRESS]));
  });
});
