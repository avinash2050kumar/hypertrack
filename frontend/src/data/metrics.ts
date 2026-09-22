export const OVERVIEW_METRICS = [
  'pnl',
  'roi',
  'maxDrawdown',
  'sharpe',
  'winRate',
  'profitFactor',
  'exposure',
  'avgHoldTime',
] as const;

export const PERFORMANCE_METRICS = [
  'pnl',
  'roi',
  'maxDrawdown',
  'sharpe',
  'realizedPnl',
  'fees',
  'netPnl',
  'volume',
  'winRate',
  'profitFactor',
  'avgWin',
  'avgLoss',
  'expectancy',
  'closingFills',
  'avgHoldTime',
  'longShort',
] as const;

export const COMPARE_CARD_METRICS = ['roi', 'maxDrawdown', 'winRate', 'sharpe'] as const;

export const COMPARE_TABLE_METRICS = [
  'pnl',
  'roi',
  'maxDrawdown',
  'sharpe',
  'winRate',
  'profitFactor',
  'expectancy',
  'netPnl',
  'fees',
  'volume',
  'avgHoldTime',
  'exposure',
] as const;

export const ATTRIBUTION_CHART_COINS = 12;
