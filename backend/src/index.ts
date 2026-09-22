import { createServer } from 'node:http';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { SHUTDOWN_TIMEOUT_MS } from './data/index.js';
import { createLogger } from './lib/logger.js';
import { HyperliquidClient } from './services/hyperliquid.js';
import { LiveRelay } from './services/live-relay.js';
import { attachLiveSocket } from './services/live-socket.js';
import { WalletService } from './services/wallet.service.js';

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL, config.NODE_ENV === 'development');

const hl = new HyperliquidClient({ config, logger });
const wallets = new WalletService(hl);
const relay = new LiveRelay({
  url: config.HL_WS_URL,
  listDexes: async () => (await hl.perpDexs()).value.names,
  maxSubscriptions: config.WS_MAX_UPSTREAM,
  logger,
});

const app = createApp({
  config,
  logger,
  wallets,
  liveSubscriptions: () => relay.subscriptionCount,
});
const server = createServer(app);
const detachLiveSocket = attachLiveSocket(server, relay, logger);

server.listen(config.PORT, () => {
  logger.info(`HyperTrack API listening on http://localhost:${config.PORT}`);
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  detachLiveSocket();
  relay.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
