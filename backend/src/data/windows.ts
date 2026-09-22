import { DAY_MS } from './time.js';

export const TIME_WINDOWS = ['24h', '7d', '30d', 'all'] as const;

export const WINDOW_DURATION_MS = {
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  all: Number.POSITIVE_INFINITY,
} as const;

// Hyperliquid's `portfolio` response names each window differently.
export const PORTFOLIO_WINDOW_KEYS = {
  '24h': 'day',
  '7d': 'week',
  '30d': 'month',
  all: 'allTime',
} as const;

export const DEFAULT_WINDOW = '7d';
