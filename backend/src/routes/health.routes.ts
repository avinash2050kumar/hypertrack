import { Router } from 'express';

import type { ApiResponse } from '../domain/index.js';

interface Health {
  status: 'ok';
  uptimeSec: number;
  liveSubscriptions: number;
}

export function healthRoutes(liveSubscriptions: () => number): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    const body: ApiResponse<Health> = {
      data: {
        status: 'ok',
        uptimeSec: Math.round(process.uptime()),
        liveSubscriptions: liveSubscriptions(),
      },
      meta: { cached: false, asOf: Date.now() },
    };
    res.json(body);
  });
  return router;
}
