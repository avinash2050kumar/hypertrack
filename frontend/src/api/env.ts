function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

// In dev Vite proxies /api and /ws, so relative URLs avoid CORS entirely.
export const API_BASE = import.meta.env.DEV ? '' : trimSlash(import.meta.env.VITE_API_URL ?? '');

export function wsUrl(path: string): string {
  const configured = import.meta.env.DEV ? '' : trimSlash(import.meta.env.VITE_WS_URL ?? '');
  if (configured) return `${configured}${path}`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}
