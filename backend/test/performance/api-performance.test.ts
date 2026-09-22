import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { MAX_BUDGET_WAIT_MS } from '../../src/data/index.js';
import { buildTestApp } from '../helpers/app.js';
import { ADDRESS } from '../helpers/fixtures.js';
import { fakeHyperliquid } from '../helpers/upstream.js';

const ADDRESSES = Array.from(
  { length: 25 },
  (_, i) => `0x${(i + 1).toString(16).padStart(40, '0')}`,
);

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

describe('API performance', () => {
  it('should serve cached positions with a p95 under 20ms', async () => {
    const { app } = buildTestApp({ fetch: fakeHyperliquid(), env: { RATE_LIMIT_PER_MIN: '1000' } });
    const path = `/api/wallets/${ADDRESS}/positions`;
    await request(app).get(path).expect(200);

    const timings: number[] = [];
    for (let i = 0; i < 100; i += 1) {
      const start = performance.now();
      await request(app).get(path).expect(200);
      timings.push(performance.now() - start);
    }

    expect(percentile(timings, 95)).toBeLessThan(20);
  });

  it('should collapse a burst of identical requests into one upstream call per resource', async () => {
    const fetch = fakeHyperliquid();
    const { app } = buildTestApp({ fetch, env: { RATE_LIMIT_PER_MIN: '1000' } });

    await Promise.all(
      Array.from({ length: 50 }, () => request(app).get(`/api/wallets/${ADDRESS}/positions`)),
    );

    const types = fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).type);
    expect(types.sort()).toEqual(['clearinghouseState', 'metaAndAssetCtxs', 'perpDexs']);
  });

  it('should summarise a full batch of 25 wallets within one second when upstream budget allows', async () => {
    const { app } = buildTestApp({
      fetch: fakeHyperliquid(),
      env: { HL_WEIGHT_PER_MIN: '100000' },
    });

    const start = performance.now();
    const response = await request(app)
      .post('/api/wallets/batch')
      .send({ addresses: ADDRESSES })
      .expect(200);

    expect(response.body.data.results).toHaveLength(25);
    expect(performance.now() - start).toBeLessThan(1_000);
  });

  it('should queue a cold batch within the budget wait cap instead of failing', async () => {
    const { app } = buildTestApp({ fetch: fakeHyperliquid() });

    const start = performance.now();
    const response = await request(app).post('/api/wallets/batch').send({ addresses: ADDRESSES });

    expect(performance.now() - start).toBeLessThan(MAX_BUDGET_WAIT_MS + 1_000);
    const limited = response.body.data.results.filter(
      (item: { ok: boolean; error?: { code: string } }) =>
        item.error?.code === 'UPSTREAM_RATE_LIMITED',
    );
    expect(limited).toHaveLength(0);
  });
});
