import type { RequestHandler } from 'express';

import { RATE_LIMIT_WINDOW_MS } from '../data/index.js';
import { AppError } from '../lib/errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs?: number;
  name: string;
}

// Fixed-window, in-memory: fine for a single stateless instance, swap for Redis when scaling out.
export function rateLimit({
  limit,
  windowMs = RATE_LIMIT_WINDOW_MS,
  name,
}: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
    res.setHeader('RateLimit-Reset', String(retryAfterSec));
    if (bucket.count <= limit) return next();

    res.setHeader('Retry-After', String(retryAfterSec));
    next(
      AppError.rateLimited(`Too many ${name} requests, retry in ${retryAfterSec}s`, retryAfterSec),
    );
  };
}
