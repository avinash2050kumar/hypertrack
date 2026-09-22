import type { Express } from 'express';

import { createApp } from '../../src/app.js';
import { loadConfig, type Config } from '../../src/config.js';
import { createLogger } from '../../src/lib/logger.js';
import { HyperliquidClient } from '../../src/services/hyperliquid.js';
import { WalletService } from '../../src/services/wallet.service.js';

export const silentLogger = createLogger('silent', false);

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', ...overrides });
}

interface TestAppOptions {
  env?: Record<string, string>;
  fetch?: typeof fetch;
  liveSubscriptions?: () => number;
}

export function buildTestApp({ env, fetch, liveSubscriptions }: TestAppOptions = {}): {
  app: Express;
  wallets: WalletService;
  hl: HyperliquidClient;
} {
  const config = testConfig(env);
  const hl = new HyperliquidClient({
    config,
    logger: silentLogger,
    fetch: fetch ?? (() => Promise.reject(new Error('network disabled in tests'))),
  });
  const wallets = new WalletService(hl);
  const app = createApp({ config, logger: silentLogger, wallets, liveSubscriptions });
  return { app, wallets, hl };
}
