import {
  attributionByCoin,
  bucketDeltas,
  computeEquityMetrics,
  computeTradeMetrics,
  drawdownSeries,
  flowAdjustedEquity,
  indexTo100,
  pnlBucketMs,
  sideBreakdown,
  summarizePositions,
  topTrades,
  type AccountSnapshot,
  type Fill,
  type PerformanceMetrics,
  type Position,
  type PriceMap,
  type SeriesPoint,
  type TimeWindow,
  type WalletCharts,
  type WalletPerformance,
} from '../domain/index.js';

export interface EquityInput {
  accountValue: SeriesPoint[];
  pnl: SeriesPoint[];
}

export function buildCharts(window: TimeWindow, equity: EquityInput): WalletCharts {
  const curve = flowAdjustedEquity(equity.accountValue, equity.pnl);
  return {
    accountValue: equity.accountValue,
    pnl: equity.pnl,
    pnlBars: bucketDeltas(equity.pnl, pnlBucketMs(window)),
    equityIndex: indexTo100(curve),
    drawdown: drawdownSeries(curve),
  };
}

export function buildMetrics(
  fills: readonly Fill[],
  prices: PriceMap,
  equity: EquityInput,
): PerformanceMetrics {
  return {
    ...computeTradeMetrics(fills, prices),
    ...computeEquityMetrics(equity.accountValue, equity.pnl),
  };
}

export function buildBreakdown(
  fills: readonly Fill[],
  prices: PriceMap,
): Pick<WalletPerformance, 'byCoin' | 'long' | 'short' | 'bestTrades' | 'worstTrades'> {
  return {
    byCoin: attributionByCoin(fills, prices),
    long: sideBreakdown(fills, 'long'),
    short: sideBreakdown(fills, 'short'),
    bestTrades: topTrades(fills, 'best'),
    worstTrades: topTrades(fills, 'worst'),
  };
}

interface PerpAccount {
  accountValue: number;
  marginUsed: number;
  withdrawable: number;
}

export function buildAccount(
  perp: PerpAccount,
  positions: readonly Position[],
  totalValue: number,
): AccountSnapshot {
  return {
    accountValue: totalValue,
    perpAccountValue: perp.accountValue,
    spotValue: Math.max(0, totalValue - perp.accountValue),
    marginUsed: perp.marginUsed,
    withdrawable: perp.withdrawable,
    ...summarizePositions(positions, totalValue),
  };
}

export function downsample(series: readonly SeriesPoint[], maxPoints: number): SeriesPoint[] {
  if (series.length <= maxPoints) return [...series];
  const step = (series.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => series[Math.round(i * step)]).filter(
    (point): point is SeriesPoint => point !== undefined,
  );
}
