import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

import { MAX_REQUEST_ID_LENGTH, REQUEST_ID_HEADER } from '../data/index.js';

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get(REQUEST_ID_HEADER);
    req.id = incoming && incoming.length <= MAX_REQUEST_ID_LENGTH ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, String(req.id));
    next();
  };
}
