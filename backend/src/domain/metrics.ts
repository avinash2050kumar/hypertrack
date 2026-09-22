import {
  DAY_MS,
  HOUR_MS,
  MIN_CAPITAL_USD,
  MIN_SHARPE_SAMPLES,
  STABLECOINS,
  TOP_TRADES_COUNT,
  TRADING_DAYS_PER_YEAR,
  WINDOW_DURATION_MS,
  WRAPPED_TOKENS,
} from '../data/index.js';
import type {
  AccountSnapshot,
  CoinAttribution,
  Drawdown,
  EquityMetrics,
  Fill,
  Position,
  PositionTrip,
  SeriesPoint,
  SideBreakdown,
  TimeWindow,
  TradeMetrics,
} from './types.js';

export type PriceMap = Readonly<Record<string, number>>;

export function windowStart(window: TimeWindow, now: number): number {
  const span = WINDOW_DURATION_MS[window];
  return Number.isFinite(span) ? now - span : 0;
}

export function filterSince<T extends { time: number }>(items: readonly T[], start: number): T[] {
  return items.filter((item) => item.time >= start);
}

function isSpotFill(fill: Fill): boolean {
  return (
    fill.dir === 'Buy' ||
    fill.dir === 'Sell' ||
    fill.coin.startsWith('@') ||
    fill.coin.includes('/')
  );
}

function isClosingFill(fill: Fill): boolean {
  if (isSpotFill(fill)) return false;
  return fill.dir.includes('Close') || fill.dir.includes('>') || fill.closedPnl !== 0;
}

function feeInUsd(fill: Fill, prices: PriceMap): number | null {
  if (STABLECOINS.has(fill.feeToken)) return fill.fee;
  const price = prices[WRAPPED_TOKENS[fill.feeToken] ?? fill.feeToken];
  if (price === undefined || !Number.isFinite(price)) return null;
  return fill.fee * price;
}

function sum(values: readonly number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function mean(values: readonly number[]): number | null {
  return values.length ? sum(values) / values.length : null;
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function realizedPnl(fills: readonly Fill[]): number {
  return sum(fills.filter(isClosingFill).map((fill) => fill.closedPnl));
}

function totalFees(fills: readonly Fill[], prices: PriceMap): number {
  return sum(fills.map((fill) => feeInUsd(fill, prices) ?? 0));
}

function volume(fills: readonly Fill[]): number {
  return sum(fills.map((fill) => fill.px * fill.sz));
}

function decisivePnls(fills: readonly Fill[]): number[] {
  return fills
    .filter(isClosingFill)
    .map((fill) => fill.closedPnl)
    .filter((pnl) => pnl !== 0);
}

function winRate(fills: readonly Fill[]): number | null {
  const pnls = decisivePnls(fills);
  if (!pnls.length) return null;
  return pnls.filter((pnl) => pnl > 0).length / pnls.length;
}

function grossProfit(fills: readonly Fill[]): number {
  return sum(decisivePnls(fills).filter((pnl) => pnl > 0));
}

function grossLoss(fills: readonly Fill[]): number {
  return sum(decisivePnls(fills).filter((pnl) => pnl < 0));
}

function profitFactor(fills: readonly Fill[]): number | null {
  const loss = grossLoss(fills);
  if (loss === 0) return null;
  return grossProfit(fills) / Math.abs(loss);
}

function avgWin(fills: readonly Fill[]): number | null {
  return mean(decisivePnls(fills).filter((pnl) => pnl > 0));
}

function avgLoss(fills: readonly Fill[]): number | null {
  return mean(decisivePnls(fills).filter((pnl) => pnl < 0));
}

function expectancy(fills: readonly Fill[]): number | null {
  const rate = winRate(fills);
  if (rate === null) return null;
  return rate * (avgWin(fills) ?? 0) - (1 - rate) * Math.abs(avgLoss(fills) ?? 0);
}

interface OpenLot {
  time: number;
  size: number;
}

function signedSize(fill: Fill): number {
  return fill.side === 'buy' ? fill.sz : -fill.sz;
}

function closeLots(
  lots: OpenLot[],
  size: number,
  time: number,
): { weightedMs: number; matched: number } {
  let remaining = size;
  let weightedMs = 0;
  let matched = 0;
  while (remaining > 0 && lots.length) {
    const lot = lots[0];
    if (!lot) break;
    const take = Math.min(lot.size, remaining);
    weightedMs += take * (time - lot.time);
    matched += take;
    remaining -= take;
    lot.size -= take;
    if (lot.size <= 0) lots.shift();
  }
  return { weightedMs, matched };
}

// FIFO-matches opens to closes per coin; opens that predate the input are unknown, so this is an estimate.
function avgHoldTime(fills: readonly Fill[]): number | null {
  const ordered = fills
    .filter((fill) => !isSpotFill(fill))
    .sort((a, b) => a.time - b.time || a.tid - b.tid);
  const lotsByCoin = new Map<string, OpenLot[]>();
  let weightedMs = 0;
  let matchedSize = 0;

  for (const fill of ordered) {
    const lots = lotsByCoin.get(fill.coin) ?? [];
    lotsByCoin.set(fill.coin, lots);
    const delta = signedSize(fill);
    const reducing = fill.startPosition !== 0 && Math.sign(delta) !== Math.sign(fill.startPosition);
    const closing = reducing ? Math.min(Math.abs(delta), Math.abs(fill.startPosition)) : 0;
    if (closing > 0) {
      const result = closeLots(lots, closing, fill.time);
      weightedMs += result.weightedMs;
      matchedSize += result.matched;
    }
    const opening = Math.abs(delta) - closing;
    if (opening > 0) {
      if (reducing) lots.length = 0;
      lots.push({ time: fill.time, size: opening });
    }
  }
  return matchedSize > 0 ? weightedMs / matchedSize : null;
}

export function computeTradeMetrics(fills: readonly Fill[], prices: PriceMap): TradeMetrics {
  const pnls = decisivePnls(fills);
  const realized = realizedPnl(fills);
  const fees = totalFees(fills, prices);
  return {
    realizedPnl: realized,
    fees,
    netPnl: realized - fees,
    volume: volume(fills),
    closingFills: fills.filter(isClosingFill).length,
    wins: pnls.filter((pnl) => pnl > 0).length,
    losses: pnls.filter((pnl) => pnl < 0).length,
    grossProfit: grossProfit(fills),
    grossLoss: grossLoss(fills),
    winRate: winRate(fills),
    profitFactor: profitFactor(fills),
    avgWin: avgWin(fills),
    avgLoss: avgLoss(fills),
    expectancy: expectancy(fills),
    avgHoldTimeMs: avgHoldTime(fills),
  };
}

function maxDrawdown(series: readonly SeriesPoint[]): Drawdown {
  let peak = Number.NEGATIVE_INFINITY;
  let abs = 0;
  let pct = 0;
  for (const point of series) {
    peak = Math.max(peak, point.v);
    const drop = peak - point.v;
    abs = Math.max(abs, drop);
    if (peak > 0) pct = Math.max(pct, drop / peak);
  }
  return { abs, pct };
}

export function drawdownSeries(series: readonly SeriesPoint[]): SeriesPoint[] {
  let peak = Number.NEGATIVE_INFINITY;
  return series.map((point) => {
    peak = Math.max(peak, point.v);
    return { t: point.t, v: peak > 0 ? (point.v - peak) / peak : 0 };
  });
}

function roi(series: readonly SeriesPoint[]): number | null {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last || series.length < 2 || first.v <= 0) return null;
  return finiteOrNull((last.v - first.v) / first.v);
}

function resampleDaily(series: readonly SeriesPoint[]): SeriesPoint[] {
  const byDay = new Map<number, number>();
  for (const point of series) byDay.set(Math.floor(point.t / DAY_MS) * DAY_MS, point.v);
  return [...byDay.entries()].sort(([a], [b]) => a - b).map(([t, v]) => ({ t, v }));
}

function periodReturns(series: readonly SeriesPoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1]?.v ?? 0;
    const curr = series[i]?.v ?? 0;
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  return returns;
}

function sampleStdDev(values: readonly number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = sum(values.map((value) => (value - avg) ** 2)) / (values.length - 1);
  return Math.sqrt(variance);
}

function sharpe(series: readonly SeriesPoint[]): number | null {
  const returns = periodReturns(resampleDaily(series));
  if (returns.length < MIN_SHARPE_SAMPLES) return null;
  const avg = sum(returns) / returns.length;
  const sd = sampleStdDev(returns, avg);
  if (sd === 0) return null;
  return finiteOrNull((avg / sd) * Math.sqrt(TRADING_DAYS_PER_YEAR));
}

function valueAt(series: readonly SeriesPoint[]): Map<number, number> {
  return new Map(series.map((point) => [point.t, point.v]));
}

// Chains period returns (Δpnl / prior account value) so deposits and withdrawals don't read as gains or losses.
export function flowAdjustedEquity(
  accountValue: readonly SeriesPoint[],
  pnl: readonly SeriesPoint[],
): SeriesPoint[] {
  const pnlAt = valueAt(pnl);
  const start = accountValue.findIndex((point) => point.v >= MIN_CAPITAL_USD);
  const origin = accountValue[start];
  if (start < 0 || !origin) return [];

  const curve: SeriesPoint[] = [{ t: origin.t, v: origin.v }];
  let equity = origin.v;
  for (let i = start + 1; i < accountValue.length; i += 1) {
    const prev = accountValue[i - 1];
    const curr = accountValue[i];
    if (!prev || !curr) continue;
    const pnlDelta = (pnlAt.get(curr.t) ?? 0) - (pnlAt.get(prev.t) ?? 0);
    const periodReturn = prev.v >= MIN_CAPITAL_USD ? pnlDelta / prev.v : 0;
    equity *= 1 + Math.max(periodReturn, -1);
    curve.push({ t: curr.t, v: equity });
  }
  return curve;
}

export function indexTo100(series: readonly SeriesPoint[]): SeriesPoint[] {
  const base = series[0]?.v;
  if (!base || base <= 0) return [];
  return series.map((point) => ({ t: point.t, v: (point.v / base) * 100 }));
}

export function seriesChange(series: readonly SeriesPoint[]): number {
  const first = series[0];
  const last = series[series.length - 1];
  return first && last ? last.v - first.v : 0;
}

export function bucketDeltas(series: readonly SeriesPoint[], bucketMs: number): SeriesPoint[] {
  const first = series[0];
  if (!first) return [];
  const closes = new Map<number, number>();
  for (const point of series) closes.set(Math.floor(point.t / bucketMs) * bucketMs, point.v);
  let previous = first.v;
  return [...closes.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, v]) => {
      const delta = v - previous;
      previous = v;
      return { t, v: delta };
    });
}

export function pnlBucketMs(window: TimeWindow): number {
  return window === '24h' ? HOUR_MS : DAY_MS;
}

export function computeEquityMetrics(
  accountValue: readonly SeriesPoint[],
  pnl: readonly SeriesPoint[],
): EquityMetrics {
  const equity = flowAdjustedEquity(accountValue, pnl);
  return {
    pnl: seriesChange(pnl),
    roi: roi(equity),
    maxDrawdown: maxDrawdown(equity),
    sharpe: sharpe(equity),
  };
}

type PricedPosition = Pick<Position, 'szi' | 'markPx'>;

function notional(position: PricedPosition): number | null {
  return position.markPx === null ? null : Math.abs(position.szi * position.markPx);
}

function sideNotional(positions: readonly PricedPosition[], long: boolean): number {
  return sum(
    positions
      .filter((position) => (long ? position.szi > 0 : position.szi < 0))
      .map((position) => notional(position) ?? 0),
  );
}

function exposure(positions: readonly PricedPosition[], accountValue: number): number | null {
  if (!(accountValue > 0)) return null;
  const total = sum(positions.map((position) => notional(position) ?? 0));
  return finiteOrNull(total / accountValue);
}

function longShortRatio(positions: readonly PricedPosition[]): number | null {
  const short = sideNotional(positions, false);
  if (short === 0) return null;
  return sideNotional(positions, true) / short;
}

export function summarizePositions(
  positions: readonly Position[],
  accountValue: number,
): Pick<
  AccountSnapshot,
  | 'totalNotional'
  | 'longNotional'
  | 'shortNotional'
  | 'exposure'
  | 'longShortRatio'
  | 'unrealizedPnl'
> {
  const longNotional = sideNotional(positions, true);
  const shortNotional = sideNotional(positions, false);
  return {
    totalNotional: longNotional + shortNotional,
    longNotional,
    shortNotional,
    exposure: exposure(positions, accountValue),
    longShortRatio: longShortRatio(positions),
    unrealizedPnl: sum(positions.map((position) => position.unrealizedPnl)),
  };
}

export function attributionByCoin(fills: readonly Fill[], prices: PriceMap): CoinAttribution[] {
  const byCoin = new Map<string, Fill[]>();
  for (const fill of fills) {
    if (isSpotFill(fill)) continue;
    byCoin.set(fill.coin, [...(byCoin.get(fill.coin) ?? []), fill]);
  }
  return [...byCoin.entries()]
    .map(([coin, coinFills]) => {
      const realized = realizedPnl(coinFills);
      const fees = totalFees(coinFills, prices);
      return {
        coin,
        realizedPnl: realized,
        fees,
        netPnl: realized - fees,
        volume: volume(coinFills),
        closingFills: coinFills.filter(isClosingFill).length,
        winRate: winRate(coinFills),
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

function fillPositionSide(fill: Fill): 'long' | 'short' {
  if (fill.startPosition !== 0) return fill.startPosition > 0 ? 'long' : 'short';
  return fill.side === 'buy' ? 'long' : 'short';
}

export function sideBreakdown(fills: readonly Fill[], side: 'long' | 'short'): SideBreakdown {
  const sideFills = fills.filter((fill) => !isSpotFill(fill) && fillPositionSide(fill) === side);
  return {
    realizedPnl: realizedPnl(sideFills),
    closingFills: sideFills.filter(isClosingFill).length,
    winRate: winRate(sideFills),
    volume: volume(sideFills),
  };
}

export function topTrades(
  fills: readonly Fill[],
  direction: 'best' | 'worst',
  count = TOP_TRADES_COUNT,
): Fill[] {
  const closing = fills.filter(isClosingFill);
  const picked =
    direction === 'best'
      ? closing.filter((fill) => fill.closedPnl > 0).sort((a, b) => b.closedPnl - a.closedPnl)
      : closing.filter((fill) => fill.closedPnl < 0).sort((a, b) => a.closedPnl - b.closedPnl);
  return picked.slice(0, count);
}

interface TripBuilder {
  trip: PositionTrip;
  entryNotional: number;
  entrySize: number;
  exitNotional: number;
  exitSize: number;
}

function isFlat(size: number, scale: number): boolean {
  return Math.abs(size) <= 1e-9 * Math.max(1, scale);
}

function startTrip(fill: Fill, side: Position['side'], openedBeforeData: boolean): TripBuilder {
  return {
    trip: {
      id: `${fill.coin}-${fill.tid}`,
      coin: fill.coin,
      side,
      status: 'open',
      openedAt: fill.time,
      closedAt: null,
      lastFillAt: fill.time,
      openedBeforeData,
      maxSize: 0,
      entryPx: null,
      exitPx: null,
      realizedPnl: 0,
      fees: 0,
      netPnl: 0,
      fillCount: 0,
    },
    entryNotional: 0,
    entrySize: 0,
    exitNotional: 0,
    exitSize: 0,
  };
}

function finishTrip(builder: TripBuilder, closedAt: number | null): PositionTrip {
  const { trip } = builder;
  return {
    ...trip,
    status: closedAt === null ? 'open' : 'closed',
    closedAt,
    entryPx: builder.entrySize > 0 ? builder.entryNotional / builder.entrySize : null,
    exitPx: builder.exitSize > 0 ? builder.exitNotional / builder.exitSize : null,
    netPnl: trip.realizedPnl - trip.fees,
  };
}

function applyFill(
  builder: TripBuilder,
  fill: Fill,
  prices: PriceMap,
  closing: number,
  opening: number,
): void {
  const { trip } = builder;
  builder.exitNotional += closing * fill.px;
  builder.exitSize += closing;
  builder.entryNotional += opening * fill.px;
  builder.entrySize += opening;
  trip.realizedPnl += fill.closedPnl;
  trip.fees += feeInUsd(fill, prices) ?? 0;
  trip.fillCount += 1;
  trip.lastFillAt = fill.time;
}

function sameSize(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

function endPosition(fill: Fill): number {
  return fill.startPosition + signedSize(fill);
}

// Trade ids aren't sequential, so fills sharing a millisecond are ordered by chaining
// each fill's startPosition to the previous fill's resulting position.
function chainSameInstant(group: readonly Fill[]): Fill[] {
  const remaining = [...group];
  const isHead = (fill: Fill) =>
    !remaining.some((other) => other !== fill && sameSize(endPosition(other), fill.startPosition));
  const ordered: Fill[] = [];
  let current = remaining.find(isHead) ?? remaining[0];
  while (current) {
    ordered.push(current);
    remaining.splice(remaining.indexOf(current), 1);
    const end = endPosition(current);
    current = remaining.find((fill) => sameSize(fill.startPosition, end)) ?? remaining[0];
  }
  return ordered;
}

function chronological(fills: readonly Fill[]): Fill[] {
  const groups = new Map<string, Fill[]>();
  for (const fill of fills) {
    const key = `${fill.time}|${fill.coin}`;
    groups.set(key, [...(groups.get(key) ?? []), fill]);
  }
  return [...groups.values()]
    .sort((a, b) => (a[0]?.time ?? 0) - (b[0]?.time ?? 0))
    .flatMap((group) => chainSameInstant(group));
}

// Rebuilds open→close position lifecycles per coin from fills, splitting at flips (long > short).
export function positionHistory(fills: readonly Fill[], prices: PriceMap): PositionTrip[] {
  const ordered = chronological(fills.filter((fill) => !isSpotFill(fill)));
  const active = new Map<string, TripBuilder>();
  const trips: PositionTrip[] = [];

  for (const fill of ordered) {
    const delta = signedSize(fill);
    const before = fill.startPosition;
    const after = before + delta;
    const scale = Math.max(Math.abs(before), Math.abs(delta));
    const beforeFlat = isFlat(before, scale);
    let builder = active.get(fill.coin);
    if (builder && beforeFlat) trips.push(finishTrip(builder, builder.trip.lastFillAt));
    if (!builder || beforeFlat) {
      const side = beforeFlat ? (delta > 0 ? 'long' : 'short') : before > 0 ? 'long' : 'short';
      builder = startTrip(fill, side, !beforeFlat);
    }

    const reducing = !beforeFlat && Math.sign(delta) !== Math.sign(before);
    const closing = reducing ? Math.min(Math.abs(delta), Math.abs(before)) : 0;
    const opening = Math.abs(delta) - closing;
    const flipped = reducing && opening > 0 && !isFlat(opening, scale);
    applyFill(builder, fill, prices, closing, flipped ? 0 : opening);
    const peak = flipped ? Math.abs(before) : Math.max(Math.abs(before), Math.abs(after));
    builder.trip.maxSize = Math.max(builder.trip.maxSize, peak);

    if (isFlat(after, scale) || flipped) {
      trips.push(finishTrip(builder, fill.time));
      active.delete(fill.coin);
    } else {
      active.set(fill.coin, builder);
    }
    if (flipped) {
      const next = startTrip(fill, after > 0 ? 'long' : 'short', false);
      next.entryNotional = opening * fill.px;
      next.entrySize = opening;
      next.trip.maxSize = Math.abs(after);
      active.set(fill.coin, next);
    }
  }
  for (const builder of active.values()) trips.push(finishTrip(builder, null));
  return trips.sort((a, b) => b.lastFillAt - a.lastFillAt);
}
