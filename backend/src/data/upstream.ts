import { MINUTE_MS, SECOND_MS } from './time.js';

export const REQUEST_TIMEOUT_MS = 8 * SECOND_MS;
export const RETRY_DELAYS_MS = [250, 750] as const;
export const LIGHT_REQUEST_WEIGHT = 2;
export const DEFAULT_REQUEST_WEIGHT = 20;
export const ITEMS_PER_EXTRA_WEIGHT = 20;
export const MAX_BUDGET_WAIT_MS = 5 * SECOND_MS;
export const PERP_DEXS_TTL_MS = 10 * MINUTE_MS;
export const FILLS_PAGE_SIZE = 2000;
export const DEFAULT_RETRY_AFTER_SEC = 5;
export const CACHE_MAX_ENTRIES = 2_000;
