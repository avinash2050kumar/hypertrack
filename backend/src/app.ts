import cors from 'cors';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';

import type { Config } from './config.js';
import { JSON_BODY_LIMIT } from './data/index.js';
import type { Logger } from './lib/logger.js';
import { errorHandler, notFound } from './middleware/error.js';
import { rateLimit } from './middleware/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { batchRoutes } from './routes/batch.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { walletRoutes } from './routes/wallet.routes.js';
import type { WalletService } from './services/wallet.service.js';

interface AppDeps {
  config: Pick<Config, 'CORS_ORIGIN' | 'RATE_LIMIT_PER_MIN' | 'RATE_LIMIT_BATCH_PER_MIN'>;
  logger: Logger;
  wallets: WalletService;
  liveSubscriptions?: () => number;
}

export function createApp({
  config,
  logger,
  wallets,
  liveSubscriptions = () => 0,
}: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(requestId());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(cors({ origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/api/health', healthRoutes(liveSubscriptions));
  app.use(
    '/api/wallets/batch',
    rateLimit({ limit: config.RATE_LIMIT_BATCH_PER_MIN, name: 'batch' }),
  );
  app.use('/api', rateLimit({ limit: config.RATE_LIMIT_PER_MIN, name: 'API' }));
  app.use('/api/wallets/batch', batchRoutes(wallets));
  app.use('/api/wallets', walletRoutes(wallets));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
