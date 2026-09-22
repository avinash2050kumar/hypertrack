import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';
import { HyperliquidClient } from './services/hyperliquid.js';
import { WalletService } from './services/wallet.service.js';

// Vercel entry: REST only. Functions can't hold WebSockets, so the live relay is not started.
// Pretty logging stays off because pino-pretty is a dev dependency and isn't bundled.
const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL, false);

const hl = new HyperliquidClient({ config, logger });
const wallets = new WalletService(hl);

export const app = createApp({ config, logger, wallets });
