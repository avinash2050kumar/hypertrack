import { SECOND_MS } from './time';

export const QUERY_STALE_MS = 10 * SECOND_MS;
export const MAX_QUERY_RETRIES = 3;
export const MAX_RETRY_DELAY_MS = 10 * SECOND_MS;
export const DASHBOARD_REFRESH_MS = 15 * SECOND_MS;
export const DETAIL_REFRESH_MS = 60 * SECOND_MS;
// Hover prefetches stay fresh long enough that the click itself doesn't refetch.
export const DETAIL_PREFETCH_STALE_MS = 30 * SECOND_MS;
export const FILLS_PAGE_SIZE = 100;
export const TRIP_FILLS_LIMIT = 500;
export const SOCKET_MAX_BACKOFF_MS = 30 * SECOND_MS;
