import type { TIME_WINDOWS } from '../data';

export type TimeWindow = (typeof TIME_WINDOWS)[number];

export interface SeriesPoint {
  t: number;
  v: number;
}

export type FillSide = 'buy' | 'sell';

export interface Fill {
  tid: number;
  hash: string;
  coin: string;
  px: number;
  sz: number;
  side: FillSide;
  dir: string;
  time: number;
  startPosition: number;
  closedPnl: number;
  fee: number;
  feeToken: string;
  crossed: boolean;
}

export type PositionSide = 'long' | 'short';

export interface Position {
  coin: string;
  side: PositionSide;
  szi: number;
  size: number;
  entryPx: number;
  markPx: number | null;
  positionValue: number;
  unrealizedPnl: number;
  returnOnEquity: number;
  liquidationPx: number | null;
  leverage: number;
  leverageType: 'cross' | 'isolated';
  marginUsed: number;
  fundingSinceOpen: number;
}

export interface AccountSnapshot {
  accountValue: number;
  perpAccountValue: number;
  spotValue: number;
  marginUsed: number;
  withdrawable: number;
  totalNotional: number;
  longNotional: number;
  shortNotional: number;
  exposure: number | null;
  longShortRatio: number | null;
  unrealizedPnl: number;
}

export interface Drawdown {
  abs: number;
  pct: number;
}

export interface TradeMetrics {
  realizedPnl: number;
  fees: number;
  netPnl: number;
  volume: number;
  closingFills: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number | null;
  profitFactor: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  expectancy: number | null;
  avgHoldTimeMs: number | null;
}

export interface EquityMetrics {
  pnl: number;
  roi: number | null;
  maxDrawdown: Drawdown;
  sharpe: number | null;
}

export type PerformanceMetrics = TradeMetrics & EquityMetrics;

export interface FillCoverage {
  count: number;
  truncated: boolean;
  oldest: number | null;
}

export interface WalletCharts {
  accountValue: SeriesPoint[];
  pnl: SeriesPoint[];
  pnlBars: SeriesPoint[];
  equityIndex: SeriesPoint[];
  drawdown: SeriesPoint[];
}

export interface WalletOverview {
  address: string;
  window: TimeWindow;
  account: AccountSnapshot;
  pnl24h: number;
  metrics: PerformanceMetrics;
  positions: Position[];
  charts: WalletCharts;
  fills: FillCoverage;
}

export interface CoinAttribution {
  coin: string;
  realizedPnl: number;
  fees: number;
  netPnl: number;
  volume: number;
  closingFills: number;
  winRate: number | null;
}

export interface SideBreakdown {
  realizedPnl: number;
  closingFills: number;
  winRate: number | null;
  volume: number;
}

export interface WalletPerformance {
  address: string;
  window: TimeWindow;
  metrics: PerformanceMetrics;
  byCoin: CoinAttribution[];
  long: SideBreakdown;
  short: SideBreakdown;
  bestTrades: Fill[];
  worstTrades: Fill[];
  fills: FillCoverage;
}

export interface PositionTrip {
  id: string;
  coin: string;
  side: PositionSide;
  status: 'open' | 'closed';
  openedAt: number;
  closedAt: number | null;
  lastFillAt: number;
  openedBeforeData: boolean;
  maxSize: number;
  entryPx: number | null;
  exitPx: number | null;
  realizedPnl: number;
  fees: number;
  netPnl: number;
  fillCount: number;
}

export interface PositionHistory {
  address: string;
  window: TimeWindow;
  trips: PositionTrip[];
  fills: FillCoverage;
}

export interface FillsPage {
  fills: Fill[];
  nextBefore: number | null;
}

export interface WalletSummary {
  address: string;
  accountValue: number;
  pnl24h: number;
  pnl7d: number;
  roi: number | null;
  winRate: number | null;
  maxDrawdownPct: number;
  openPositions: number;
  sparkline: SeriesPoint[];
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export type BatchItem =
  | { address: string; ok: true; summary: WalletSummary }
  | { address: string; ok: false; error: ApiErrorPayload };

export interface BatchResponse {
  window: TimeWindow;
  results: BatchItem[];
}

export interface LiveWalletState {
  address: string;
  at: number;
  perpAccountValue: number;
  marginUsed: number;
  withdrawable: number;
  positions: Position[];
}

export type WalletSocketMessage =
  | { type: 'snapshot'; data: LiveWalletState }
  | { type: 'status'; status: 'connected' | 'reconnecting' | 'upstream-down' }
  | { type: 'error'; error: ApiErrorPayload };

export interface ResponseMeta {
  cached: boolean;
  asOf: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: ResponseMeta;
}
