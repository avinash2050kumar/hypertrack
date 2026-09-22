import { Router } from 'express';

import { addressParamsSchema, fillsQuerySchema, windowQuerySchema } from '../domain/index.js';
import { validate } from '../middleware/validate.js';
import type { WalletService } from '../services/wallet.service.js';

export function walletRoutes(wallets: WalletService): Router {
  const router = Router();

  router.get('/:address/overview', async (req, res) => {
    const { address } = validate(addressParamsSchema, req.params, 'params');
    const { window } = validate(windowQuerySchema, req.query, 'query');
    res.json(await wallets.overview(address, window));
  });

  router.get('/:address/performance', async (req, res) => {
    const { address } = validate(addressParamsSchema, req.params, 'params');
    const { window } = validate(windowQuerySchema, req.query, 'query');
    res.json(await wallets.performance(address, window));
  });

  router.get('/:address/positions', async (req, res) => {
    const { address } = validate(addressParamsSchema, req.params, 'params');
    res.json(await wallets.positions(address));
  });

  router.get('/:address/fills', async (req, res) => {
    const { address } = validate(addressParamsSchema, req.params, 'params');
    res.json(await wallets.fills(address, validate(fillsQuerySchema, req.query, 'query')));
  });

  router.get('/:address/position-history', async (req, res) => {
    const { address } = validate(addressParamsSchema, req.params, 'params');
    const { window } = validate(windowQuerySchema, req.query, 'query');
    res.json(await wallets.positionHistory(address, window));
  });

  router.get('/:address/pnl-history', async (req, res) => {
    const { address } = validate(addressParamsSchema, req.params, 'params');
    const { window } = validate(windowQuerySchema, req.query, 'query');
    res.json(await wallets.pnlHistory(address, window));
  });

  return router;
}
