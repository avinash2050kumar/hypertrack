import { Router } from 'express';

import { batchBodySchema, type ApiResponse, type BatchResponse } from '../domain/index.js';
import { validate } from '../middleware/validate.js';
import type { WalletService } from '../services/wallet.service.js';

export function batchRoutes(wallets: WalletService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const { addresses, window } = validate(batchBodySchema, req.body, 'body');
    const results = await wallets.batch(addresses, window);
    const body: ApiResponse<BatchResponse> = {
      data: { window, results },
      meta: { cached: false, asOf: Date.now() },
    };
    res.json(body);
  });

  return router;
}
