import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('should apply defaults when the environment is empty', () => {
    const config = loadConfig({});

    expect(config).toMatchObject({
      NODE_ENV: 'development',
      PORT: 8787,
      CORS_ORIGIN: '*',
      TRUST_PROXY: 'loopback',
      RATE_LIMIT_PER_MIN: 60,
      RATE_LIMIT_BATCH_PER_MIN: 10,
      LOG_LEVEL: 'info',
    });
  });

  it('should coerce numeric strings into numbers', () => {
    const config = loadConfig({ PORT: '3000', CACHE_TTL_FILLS: '0', RATE_LIMIT_PER_MIN: '5' });

    expect(config.PORT).toBe(3000);
    expect(config.CACHE_TTL_FILLS).toBe(0);
    expect(config.RATE_LIMIT_PER_MIN).toBe(5);
  });

  it('should parse a numeric TRUST_PROXY as a hop count', () => {
    expect(loadConfig({ TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
  });

  it('should keep a named TRUST_PROXY value as a string', () => {
    expect(loadConfig({ TRUST_PROXY: 'loopback, 10.0.0.0/8' }).TRUST_PROXY).toBe(
      'loopback, 10.0.0.0/8',
    );
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '-1'],
    ['NODE_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
    ['HL_API_URL', 'not-a-url'],
    ['CACHE_TTL_META', '-5'],
    ['RATE_LIMIT_PER_MIN', '0'],
  ])('should reject an invalid %s of %j', (key, value) => {
    expect(() => loadConfig({ [key]: value })).toThrow(/Invalid environment configuration/);
  });

  it('should name every invalid field in the error message', () => {
    expect(() => loadConfig({ PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(/PORT[\s\S]*LOG_LEVEL/);
  });
});
