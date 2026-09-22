import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadEnv({ DEV, ...vars }: { DEV: boolean } & Record<string, string | boolean>) {
  vi.resetModules();
  vi.stubEnv('DEV', DEV);
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, String(value));
  return import('../../src/api/env');
}

describe('API environment', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('should use relative URLs in development so the Vite proxy applies', async () => {
    const env = await loadEnv({ DEV: true, VITE_API_URL: 'https://api.example.com' });

    expect(env.API_BASE).toBe('');
    expect(env.wsUrl('/ws/wallet/x')).toBe(`ws://${window.location.host}/ws/wallet/x`);
  });

  it('should use the configured API URL in production without a trailing slash', async () => {
    const env = await loadEnv({ DEV: false, VITE_API_URL: 'https://api.example.com//' });

    expect(env.API_BASE).toBe('https://api.example.com');
  });

  it('should build socket URLs from VITE_WS_URL in production', async () => {
    const env = await loadEnv({ DEV: false, VITE_WS_URL: 'wss://live.example.com/' });

    expect(env.wsUrl('/ws/wallet/x')).toBe('wss://live.example.com/ws/wallet/x');
    expect(env.LIVE_ENABLED).toBe(true);
  });

  it('should disable live updates when VITE_WS_URL is off', async () => {
    const env = await loadEnv({ DEV: false, VITE_WS_URL: 'off' });

    expect(env.LIVE_ENABLED).toBe(false);
  });

  it('should keep live updates on in development even if disabled for production', async () => {
    const env = await loadEnv({ DEV: true, VITE_WS_URL: 'off' });

    expect(env.LIVE_ENABLED).toBe(true);
  });
});
