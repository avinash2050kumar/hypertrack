import { COMPACT_THRESHOLD, DAY_MS, EMPTY_VALUE, HOUR_MS, MINUS_SIGN, MINUTE_MS } from '../data';

type Nullable = number | null | undefined;
type CompactMode = 'auto' | 'always' | 'never';

interface UsdOptions {
  compact?: CompactMode;
  signed?: boolean;
}

function isFiniteNumber(value: Nullable): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function signPrefix(value: number, signed: boolean): string {
  if (value < 0) return MINUS_SIGN;
  if (signed && value > 0) return '+';
  return '';
}

function shouldCompact(abs: number, mode: CompactMode): boolean {
  if (mode === 'always') return abs >= 1000;
  if (mode === 'never') return false;
  return abs >= COMPACT_THRESHOLD;
}

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function fixed(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatUsd(value: Nullable, options: UsdOptions = {}): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const abs = Math.abs(value);
  const body = shouldCompact(abs, options.compact ?? 'auto')
    ? compactFormatter.format(abs)
    : fixed(abs, 2);
  if (body === '0.00') return '$0.00';
  return `${signPrefix(value, options.signed ?? false)}$${body}`;
}

export function formatPnl(value: Nullable, compact: CompactMode = 'auto'): string {
  return formatUsd(value, { signed: true, compact });
}

export function formatPct(
  value: Nullable,
  options: { signed?: boolean; decimals?: number } = {},
): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const pct = value * 100;
  const body = fixed(Math.abs(pct), options.decimals ?? 2);
  if (Number(body.replace(/,/g, '')) === 0) return `${fixed(0, options.decimals ?? 2)}%`;
  return `${signPrefix(pct, options.signed ?? false)}${body}%`;
}

export function formatNumber(value: Nullable, decimals = 2): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  return `${value < 0 ? MINUS_SIGN : ''}${fixed(Math.abs(value), decimals)}`;
}

export function formatCompact(value: Nullable): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const abs = Math.abs(value);
  const body = abs >= 1000 ? compactFormatter.format(abs) : fixed(abs, 2);
  return `${value < 0 ? MINUS_SIGN : ''}${body}`;
}

export function formatPrice(value: Nullable): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const abs = Math.abs(value);
  if (abs >= 1000) return formatNumber(value, 2);
  if (abs >= 1) return formatNumber(value, 4);
  return `${value < 0 ? MINUS_SIGN : ''}${abs.toPrecision(5)}`;
}

export function formatSize(value: Nullable): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const abs = Math.abs(value);
  if (abs >= COMPACT_THRESHOLD) return formatCompact(value);
  return formatNumber(value, abs >= 100 ? 2 : 4);
}

export function formatRatio(value: Nullable, suffix = ''): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  return `${formatNumber(value, 2)}${suffix}`;
}

export function formatLeverage(value: Nullable): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}×`;
}

export function formatDuration(ms: Nullable): string {
  if (!isFiniteNumber(ms) || ms < 0) return EMPTY_VALUE;
  if (ms < MINUTE_MS) return `${Math.round(ms / 1000)}s`;
  if (ms < HOUR_MS) return `${Math.round(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    const minutes = Math.round((ms % HOUR_MS) / MINUTE_MS);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.round((ms % DAY_MS) / HOUR_MS);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

export function formatDateTime(t: Nullable): string {
  if (!isFiniteNumber(t)) return EMPTY_VALUE;
  return new Date(t).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(t: Nullable): string {
  if (!isFiniteNumber(t)) return EMPTY_VALUE;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatRelativeTime(t: Nullable, now = Date.now()): string {
  if (!isFiniteNumber(t)) return EMPTY_VALUE;
  const diff = Math.max(0, now - t);
  if (diff < 10_000) return 'just now';
  return `${formatDuration(diff).split(' ')[0]} ago`;
}

export function shortAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}
