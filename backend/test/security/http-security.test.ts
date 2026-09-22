import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { buildTestApp } from '../helpers/app.js';
import { ADDRESS } from '../helpers/fixtures.js';

describe('CORS', () => {
  const env = { CORS_ORIGIN: 'https://app.example.com, https://www.example.com/' };

  it('should allow a configured origin', async () => {
    const { app } = buildTestApp({ env });

    const response = await request(app).get('/api/health').set('Origin', 'https://app.example.com');

    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('should normalise whitespace and trailing slashes in the allow-list', async () => {
    const { app } = buildTestApp({ env });

    const response = await request(app).get('/api/health').set('Origin', 'https://www.example.com');

    expect(response.headers['access-control-allow-origin']).toBe('https://www.example.com');
  });

  it('should not grant access to other origins', async () => {
    const { app } = buildTestApp({ env });

    const response = await request(app).get('/api/health').set('Origin', 'https://evil.test');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should not treat a lookalike subdomain as allowed', async () => {
    const { app } = buildTestApp({ env });

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://app.example.com.evil.test');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should answer preflight requests for allowed origins', async () => {
    const { app } = buildTestApp({ env });

    const response = await request(app)
      .options('/api/wallets/batch')
      .set('Origin', 'https://app.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });

  it('should reflect any origin when configured with a wildcard', async () => {
    const { app } = buildTestApp({ env: { CORS_ORIGIN: '*' } });

    const response = await request(app).get('/api/health').set('Origin', 'https://anywhere.test');

    expect(response.headers['access-control-allow-origin']).toBe('https://anywhere.test');
  });
});

describe('rate limiting', () => {
  it('should return 429 with retry headers once the limit is exceeded', async () => {
    const { app, wallets } = buildTestApp({ env: { RATE_LIMIT_PER_MIN: '3' } });
    vi.spyOn(wallets, 'positions').mockResolvedValue({
      data: [],
      meta: { cached: false, asOf: 1 },
    });
    const path = `/api/wallets/${ADDRESS}/positions`;

    for (let i = 0; i < 3; i += 1) await request(app).get(path).expect(200);
    const response = await request(app).get(path).expect(429);

    expect(response.body.error).toMatchObject({
      code: 'RATE_LIMITED',
      details: { retryAfterSec: expect.any(Number) },
    });
    expect(response.headers['retry-after']).toMatch(/^\d+$/);
    expect(response.headers['ratelimit-limit']).toBe('3');
    expect(response.headers['ratelimit-remaining']).toBe('0');
  });

  it('should count down the remaining allowance', async () => {
    const { app } = buildTestApp({ env: { RATE_LIMIT_PER_MIN: '5' } });

    const response = await request(app).get('/api/nope');

    expect(response.headers['ratelimit-remaining']).toBe('4');
  });

  it('should apply a stricter limit to batch requests', async () => {
    const { app, wallets } = buildTestApp({ env: { RATE_LIMIT_BATCH_PER_MIN: '1' } });
    vi.spyOn(wallets, 'batch').mockResolvedValue([]);

    await request(app)
      .post('/api/wallets/batch')
      .send({ addresses: [ADDRESS] })
      .expect(200);
    const response = await request(app)
      .post('/api/wallets/batch')
      .send({ addresses: [ADDRESS] });

    expect(response.status).toBe(429);
    expect(response.body.error.message).toMatch(/Too many batch requests/);
  });

  it('should keep the health check outside the rate limit', async () => {
    const { app } = buildTestApp({ env: { RATE_LIMIT_PER_MIN: '1' } });

    await request(app).get('/api/nope');
    await request(app).get('/api/nope').expect(429);

    await request(app).get('/api/health').expect(200);
  });

  it('should ignore spoofed X-Forwarded-For headers from untrusted peers', async () => {
    const { app } = buildTestApp({ env: { RATE_LIMIT_PER_MIN: '1', TRUST_PROXY: '10.0.0.1' } });

    await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.1');
    const response = await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.2');

    expect(response.status).toBe(429);
  });

  it('should rate limit each client separately behind a trusted proxy', async () => {
    const { app } = buildTestApp({ env: { RATE_LIMIT_PER_MIN: '1', TRUST_PROXY: '1' } });

    await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.1');
    const otherClient = await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.2');
    const sameClient = await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.1');

    expect(otherClient.status).toBe(404);
    expect(sameClient.status).toBe(429);
  });
});

describe('information disclosure', () => {
  it('should not advertise the server framework', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should hide internal error details from clients', async () => {
    const { app, wallets } = buildTestApp();
    vi.spyOn(wallets, 'positions').mockRejectedValue(
      new Error('ECONNREFUSED 10.0.0.5:5432 at /srv/app/db.js:42'),
    );

    const response = await request(app).get(`/api/wallets/${ADDRESS}/positions`).expect(500);

    expect(response.body).toEqual({
      error: { code: 'INTERNAL', message: 'Unexpected server error' },
    });
    expect(response.text).not.toMatch(/10\.0\.0\.5|db\.js|stack/);
  });

  it('should always respond with JSON, even for hostile paths', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/%3Cscript%3Ealert(1)%3C%2Fscript%3E');

    expect(response.headers['content-type']).toMatch(/^application\/json/);
  });
});

describe('input handling', () => {
  it('should reject request bodies over 32kb', async () => {
    const { app } = buildTestApp();
    const addresses = Array.from({ length: 1_000 }, () => ADDRESS);

    const response = await request(app).post('/api/wallets/batch').send({ addresses }).expect(413);

    expect(response.body.error).toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body exceeds 32kb',
    });
  });

  it('should not resolve path traversal attempts', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/wallets/..%2F..%2Fetc%2Fpasswd/overview');

    expect(response.status).toBe(400);
    expect(response.text).not.toContain('root:');
  });

  it('should reject addresses carrying injection payloads', async () => {
    const { app, wallets } = buildTestApp();
    const spy = vi.spyOn(wallets, 'overview');

    await request(app).get(`/api/wallets/${ADDRESS}'%20OR%201=1--/overview`).expect(400);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should ignore prototype pollution attempts in JSON bodies', async () => {
    const { app } = buildTestApp();

    await request(app)
      .post('/api/wallets/batch')
      .set('content-type', 'application/json')
      .send('{"addresses":["x"],"__proto__":{"polluted":true}}');

    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});
