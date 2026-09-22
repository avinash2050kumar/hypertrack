import { DAY_MS, SECOND_MS } from './time';

export const NAV_ITEMS = [
  { to: '/', label: 'Watchlist', end: true },
  { to: '/compare', label: 'Compare', end: false },
] as const;

export const WALLET_TAB_IDS = ['overview', 'positions', 'performance', 'fills'] as const;
export type WalletTab = (typeof WALLET_TAB_IDS)[number];

export const WALLET_TABS: readonly { id: WalletTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'positions', label: 'Positions' },
  { id: 'performance', label: 'Performance' },
  { id: 'fills', label: 'Fills' },
];

export type SocketStatus = 'connecting' | 'live' | 'reconnecting' | 'unavailable';

export const SOCKET_STATUS_COPY: Record<
  SocketStatus,
  { label: string; tone: 'neutral' | 'positive' | 'warning'; pulse: boolean }
> = {
  connecting: { label: 'Connecting', tone: 'neutral', pulse: false },
  live: { label: 'Live', tone: 'positive', pulse: true },
  reconnecting: { label: 'Reconnecting', tone: 'warning', pulse: false },
  unavailable: { label: 'Polling', tone: 'neutral', pulse: false },
};

export const TOAST_DURATION_MS = 6 * SECOND_MS;
export const SPARKLINE_SIZE = { width: 96, height: 28 } as const;
export const SPARKLINE_CARD_SIZE = { width: 112, height: 36 } as const;

// Charts spanning less than this label ticks with times instead of dates.
export const CHART_INTRADAY_SPAN_MS = 2 * DAY_MS;

export const LEVERAGE_WARNING = 20;
