import type { ReactNode } from 'react';

import {
  formatDuration,
  formatNumber,
  formatPct,
  formatRatio,
  formatUsd,
  type AccountSnapshot,
  type PerformanceMetrics,
} from '../../domain';
import { PnlValue } from './pnl-value';
import type { StatItem } from './stat-grid';

interface MetricSource {
  metrics: PerformanceMetrics;
  account?: AccountSnapshot;
}

export interface MetricDef {
  id: string;
  label: string;
  info: string;
  better: 'higher' | 'lower' | null;
  value: (source: MetricSource) => number | null;
  render: (value: number | null) => ReactNode;
  hint?: (source: MetricSource) => ReactNode;
}

const pnl = (value: number | null) => <PnlValue value={value} />;
const signedPct = (value: number | null) => <PnlValue value={value} format="pct" />;

export const METRICS = {
  pnl: {
    id: 'pnl',
    label: 'PnL',
    info: 'Change in Hyperliquid’s cumulative PnL over the window. Deposits and withdrawals are excluded.',
    better: 'higher',
    value: ({ metrics }) => metrics.pnl,
    render: pnl,
  },
  roi: {
    id: 'roi',
    label: 'ROI',
    info: 'Time-weighted return: each period’s PnL ÷ the account value before it, compounded. Flows don’t count as returns.',
    better: 'higher',
    value: ({ metrics }) => metrics.roi,
    render: signedPct,
  },
  maxDrawdown: {
    id: 'maxDrawdown',
    label: 'Max drawdown',
    info: 'Largest peak-to-trough drop of the flow-adjusted equity curve in this window.',
    better: 'lower',
    value: ({ metrics }) => metrics.maxDrawdown.pct,
    render: (value) => formatPct(value),
    hint: ({ metrics }) => formatUsd(metrics.maxDrawdown.abs, { compact: 'always' }),
  },
  sharpe: {
    id: 'sharpe',
    label: 'Sharpe',
    info: 'Mean daily return ÷ standard deviation × √365, zero risk-free rate. Needs at least 5 daily returns.',
    better: 'higher',
    value: ({ metrics }) => metrics.sharpe,
    render: (value) => formatRatio(value),
  },
  winRate: {
    id: 'winRate',
    label: 'Win rate',
    info: 'Winning closing fills ÷ (wins + losses). Breakeven closes are excluded.',
    better: 'higher',
    value: ({ metrics }) => metrics.winRate,
    render: (value) => formatPct(value, { decimals: 1 }),
    hint: ({ metrics }) => `${metrics.wins}W · ${metrics.losses}L`,
  },
  profitFactor: {
    id: 'profitFactor',
    label: 'Profit factor',
    info: 'Gross profit ÷ |gross loss| across closing fills. Blank when there are no losses.',
    better: 'higher',
    value: ({ metrics }) => metrics.profitFactor,
    render: (value) => formatRatio(value, '×'),
  },
  realizedPnl: {
    id: 'realizedPnl',
    label: 'Realized PnL',
    info: 'Σ closedPnl over closing fills in the window (before fees).',
    better: 'higher',
    value: ({ metrics }) => metrics.realizedPnl,
    render: pnl,
  },
  fees: {
    id: 'fees',
    label: 'Fees',
    info: 'Σ fees in USD. Non-USDC fee tokens are converted at the current mark price; negative means net rebates.',
    better: 'lower',
    value: ({ metrics }) => metrics.fees,
    render: (value) => formatUsd(value),
  },
  netPnl: {
    id: 'netPnl',
    label: 'Net realized',
    info: 'Realized PnL − fees.',
    better: 'higher',
    value: ({ metrics }) => metrics.netPnl,
    render: pnl,
  },
  volume: {
    id: 'volume',
    label: 'Volume',
    info: 'Σ price × size across every fill, spot included.',
    better: null,
    value: ({ metrics }) => metrics.volume,
    render: (value) => formatUsd(value, { compact: 'always' }),
  },
  avgWin: {
    id: 'avgWin',
    label: 'Avg win',
    info: 'Mean closedPnl of winning closing fills.',
    better: 'higher',
    value: ({ metrics }) => metrics.avgWin,
    render: pnl,
  },
  avgLoss: {
    id: 'avgLoss',
    label: 'Avg loss',
    info: 'Mean closedPnl of losing closing fills.',
    better: 'higher',
    value: ({ metrics }) => metrics.avgLoss,
    render: pnl,
  },
  expectancy: {
    id: 'expectancy',
    label: 'Expectancy',
    info: 'winRate × avgWin − (1 − winRate) × |avgLoss|: the average result of one closing fill.',
    better: 'higher',
    value: ({ metrics }) => metrics.expectancy,
    render: pnl,
  },
  avgHoldTime: {
    id: 'avgHoldTime',
    label: 'Avg hold (est.)',
    info: 'Estimate: opens and closes are matched FIFO per coin and weighted by size. Opens before the window are unknown.',
    better: null,
    value: ({ metrics }) => metrics.avgHoldTimeMs,
    render: (value) => formatDuration(value),
  },
  closingFills: {
    id: 'closingFills',
    label: 'Closing fills',
    info: 'Fills that reduced or closed a perp position (dir contains “Close” or “>”, or closedPnl ≠ 0).',
    better: null,
    value: ({ metrics }) => metrics.closingFills,
    render: (value) => formatNumber(value, 0),
  },
  exposure: {
    id: 'exposure',
    label: 'Exposure',
    info: 'Σ |position size × mark price| ÷ account value. 1.0× means notional equals equity.',
    better: null,
    value: ({ account }) => account?.exposure ?? null,
    render: (value) => formatRatio(value, '×'),
  },
  longShort: {
    id: 'longShort',
    label: 'Long / short',
    info: 'Long notional ÷ short notional across open positions. Blank when there are no shorts.',
    better: null,
    value: ({ account }) => account?.longShortRatio ?? null,
    render: (value) => formatRatio(value),
    hint: ({ account }) =>
      account
        ? `${formatUsd(account.longNotional, { compact: 'always' })} L · ${formatUsd(account.shortNotional, { compact: 'always' })} S`
        : null,
  },
} satisfies Record<string, MetricDef>;

export type MetricId = keyof typeof METRICS;

export function metricStats(ids: readonly MetricId[], source: MetricSource): StatItem[] {
  return ids.map((id) => {
    const def: MetricDef = METRICS[id];
    return {
      id,
      label: def.label,
      info: def.info,
      value: def.render(def.value(source)),
      hint: def.hint?.(source),
    };
  });
}
