export const TIME_WINDOWS = ['24h', '7d', '30d', 'all'] as const;

export const TIME_WINDOW_LABELS = {
  '24h': '24H',
  '7d': '7D',
  '30d': '30D',
  all: 'All',
} as const;

export const DEFAULT_WINDOW = '7d';
