import { SECOND_MS } from './time.js';

export const LIVE_SOCKET_PATH = /^\/ws\/wallet\/([^/?#]+)\/?$/;
export const CLIENT_HEARTBEAT_MS = 30 * SECOND_MS;
export const UPSTREAM_PING_INTERVAL_MS = 30 * SECOND_MS;
export const UPSTREAM_MAX_BACKOFF_MS = 30 * SECOND_MS;
export const UPSTREAM_IDLE_DISCONNECT_MS = 60 * SECOND_MS;
