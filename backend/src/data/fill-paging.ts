import { HOUR_MS, MINUTE_MS } from './time.js';

export const MAX_FILL_PAGES = 10;
// Enough fills for stable statistics without spending the whole upstream weight budget on one wallet.
export const TARGET_WINDOW_FILLS = 6_000;
export const TARGET_PAGE_FILLS = 1_500;
// Rounding page boundaries keeps cache keys stable between requests.
export const CURSOR_ROUNDING_MS = 5 * MINUTE_MS;
export const MIN_SPAN_MS = CURSOR_ROUNDING_MS;
export const SPAN_LADDER_MS = [
  MIN_SPAN_MS,
  15 * MINUTE_MS,
  HOUR_MS,
  4 * HOUR_MS,
  12 * HOUR_MS,
  24 * HOUR_MS,
  72 * HOUR_MS,
  168 * HOUR_MS,
  720 * HOUR_MS,
  8_760 * HOUR_MS,
  87_600 * HOUR_MS,
] as const;
