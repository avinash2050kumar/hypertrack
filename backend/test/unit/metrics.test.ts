import { describe, expect, it } from 'vitest';

import {
  attributionByCoin,
  bucketDeltas,
  computeEquityMetrics,
  computeTradeMetrics,
  drawdownSeries,
  filterSince,
  flowAdjustedEquity,
  indexTo100,
  pnlBucketMs,
  positionHistory,
  seriesChange,
  sideBreakdown,
  summarizePositions,
  topTrades,
  windowStart,
} from '../../src/domain/index.js';
import { closingFill, DAY, HOUR, makeFill, makePosition, makeSeries } from '../helpers/fixtures.js';

describe('windowStart', () => {
  const now = 10 * DAY;

  it.each([
    ['24h', now - DAY],
    ['7d', now - 7 * DAY],
    ['30d', now - 30 * DAY],
  ] as const)('should start the %s window the right span before now', (window, expected) => {
    expect(windowStart(window, now)).toBe(expected);
  });

  it('should start the all-time window at the epoch', () => {
    expect(windowStart('all', now)).toBe(0);
  });
});

describe('filterSince', () => {
  it('should keep items at or after the start time', () => {
    const items = [{ time: 1 }, { time: 5 }, { time: 10 }];

    expect(filterSince(items, 5)).toEqual([{ time: 5 }, { time: 10 }]);
  });
});

describe('computeTradeMetrics', () => {
  const fills = [
    makeFill({ fee: 1 }),
    closingFill(100, { fee: 1 }),
    closingFill(50, { fee: 1 }),
    closingFill(-30, { fee: 1 }),
  ];

  it('should summarise realized PnL, fees and volume', () => {
    expect(computeTradeMetrics(fills, {})).toMatchObject({
      realizedPnl: 120,
      fees: 4,
      netPnl: 116,
      volume: 400,
      closingFills: 3,
    });
  });

  it('should compute win statistics from closing fills only', () => {
    const metrics = computeTradeMetrics(fills, {});

    expect(metrics).toMatchObject({
      wins: 2,
      losses: 1,
      grossProfit: 150,
      grossLoss: -30,
      profitFactor: 5,
      avgWin: 75,
      avgLoss: -30,
    });
    expect(metrics.winRate).toBeCloseTo(2 / 3);
    expect(metrics.expectancy).toBeCloseTo(40);
  });

  it('should return nulls instead of NaN when there are no trades', () => {
    expect(computeTradeMetrics([], {})).toMatchObject({
      realizedPnl: 0,
      winRate: null,
      profitFactor: null,
      avgWin: null,
      avgLoss: null,
      expectancy: null,
      avgHoldTimeMs: null,
    });
  });

  it('should leave profit factor undefined when nothing was lost', () => {
    expect(computeTradeMetrics([closingFill(10), closingFill(20)], {}).profitFactor).toBeNull();
  });

  it('should ignore break-even closes in the win rate', () => {
    const metrics = computeTradeMetrics([closingFill(10), closingFill(0), closingFill(-10)], {});

    expect(metrics.winRate).toBe(0.5);
    expect(metrics.closingFills).toBe(3);
  });

  it('should not treat spot trades as closing trades', () => {
    const spot = [
      makeFill({ dir: 'Sell', coin: '@107', closedPnl: 25 }),
      makeFill({ dir: 'Buy', coin: 'PURR/USDC', closedPnl: 5 }),
    ];

    expect(computeTradeMetrics(spot, {})).toMatchObject({ realizedPnl: 0, closingFills: 0 });
  });

  it('should convert fees paid in wrapped tokens using the underlying price', () => {
    const fill = makeFill({ fee: 0.0001, feeToken: 'UBTC' });

    expect(computeTradeMetrics([fill], { BTC: 50_000 }).fees).toBeCloseTo(5);
  });

  it('should skip fees in tokens without a known price', () => {
    expect(computeTradeMetrics([makeFill({ fee: 3, feeToken: 'MYSTERY' })], {}).fees).toBe(0);
  });

  it('should measure average hold time by matching opens to closes', () => {
    const open = makeFill({ coin: 'ETH', side: 'buy', sz: 2, startPosition: 0, time: 0 });
    const close = makeFill({
      coin: 'ETH',
      side: 'sell',
      sz: 2,
      startPosition: 2,
      dir: 'Close Long',
      time: 2 * HOUR,
    });

    expect(computeTradeMetrics([close, open], {}).avgHoldTimeMs).toBe(2 * HOUR);
  });
});

describe('drawdownSeries', () => {
  it('should express each point as the fall from the running peak', () => {
    const result = drawdownSeries(makeSeries([100, 120, 90, 130]));

    expect(result.map((point) => point.v)).toEqual([0, 0, -0.25, 0]);
  });

  it('should stay at zero while equity is not positive', () => {
    expect(drawdownSeries(makeSeries([0, 0])).map((point) => point.v)).toEqual([0, 0]);
  });
});

describe('flowAdjustedEquity', () => {
  it('should compound trading returns', () => {
    const curve = flowAdjustedEquity(makeSeries([100, 110, 121]), makeSeries([0, 10, 21]));

    expect(curve.map((point) => point.v)).toEqual([100, expect.closeTo(110), expect.closeTo(121)]);
  });

  it('should not count deposits as gains', () => {
    const curve = flowAdjustedEquity(makeSeries([100, 200, 200]), makeSeries([0, 0, 0]));

    expect(curve.map((point) => point.v)).toEqual([100, 100, 100]);
  });

  it('should start from the first point with meaningful capital', () => {
    const curve = flowAdjustedEquity(makeSeries([0.5, 100, 110]), makeSeries([0, 0, 10]));

    expect(curve[0]).toEqual({ t: DAY, v: 100 });
    expect(curve).toHaveLength(2);
  });

  it('should return an empty curve for an account that never held capital', () => {
    expect(flowAdjustedEquity(makeSeries([0, 0.2]), makeSeries([0, 0]))).toEqual([]);
  });

  it('should never let a single period lose more than everything', () => {
    const curve = flowAdjustedEquity(makeSeries([100, 10]), makeSeries([0, -500]));

    expect(curve[1]?.v).toBe(0);
  });
});

describe('computeEquityMetrics', () => {
  it('should report ROI, PnL change and max drawdown', () => {
    const metrics = computeEquityMetrics(makeSeries([100, 120, 90]), makeSeries([0, 20, -10]));

    expect(metrics.pnl).toBe(-10);
    expect(metrics.roi).toBeCloseTo(-0.1);
    expect(metrics.maxDrawdown.abs).toBeCloseTo(30);
    expect(metrics.maxDrawdown.pct).toBeCloseTo(0.25);
  });

  it('should leave ROI and Sharpe empty for too little history', () => {
    const metrics = computeEquityMetrics(makeSeries([100]), makeSeries([0]));

    expect(metrics.roi).toBeNull();
    expect(metrics.sharpe).toBeNull();
  });

  it('should compute an annualised Sharpe ratio with enough daily samples', () => {
    const values = [100, 101, 103, 102, 105, 107, 106];
    const pnl = values.map((v) => v - 100);

    const { sharpe } = computeEquityMetrics(makeSeries(values), makeSeries(pnl));

    expect(sharpe).not.toBeNull();
    expect(sharpe).toBeGreaterThan(0);
  });

  it('should leave Sharpe empty when returns never vary', () => {
    const flat = [100, 100, 100, 100, 100, 100, 100];

    expect(computeEquityMetrics(makeSeries(flat), makeSeries(flat.map(() => 0))).sharpe).toBeNull();
  });
});

describe('series helpers', () => {
  it('should index a series to 100', () => {
    expect(indexTo100(makeSeries([50, 75, 25])).map((point) => point.v)).toEqual([100, 150, 50]);
  });

  it('should not index a series that starts at zero', () => {
    expect(indexTo100(makeSeries([0, 10]))).toEqual([]);
  });

  it('should report the change between the first and last point', () => {
    expect(seriesChange(makeSeries([10, 40, 25]))).toBe(15);
    expect(seriesChange([])).toBe(0);
  });

  it('should turn a cumulative series into per-bucket deltas', () => {
    const series = makeSeries([0, 5, 8, 20], HOUR / 2);

    expect(bucketDeltas(series, HOUR)).toEqual([
      { t: 0, v: 5 },
      { t: HOUR, v: 15 },
    ]);
  });

  it('should bucket 24h PnL hourly and longer windows daily', () => {
    expect(pnlBucketMs('24h')).toBe(HOUR);
    expect(pnlBucketMs('30d')).toBe(DAY);
  });
});

describe('summarizePositions', () => {
  const positions = [
    makePosition({ coin: 'BTC', szi: 2, markPx: 100, unrealizedPnl: 15 }),
    makePosition({ coin: 'ETH', szi: -1, markPx: 50, unrealizedPnl: -5 }),
  ];

  it('should split notional by side and compute exposure', () => {
    expect(summarizePositions(positions, 500)).toEqual({
      totalNotional: 250,
      longNotional: 200,
      shortNotional: 50,
      exposure: 0.5,
      longShortRatio: 4,
      unrealizedPnl: 10,
    });
  });

  it('should leave exposure empty for an account with no value', () => {
    expect(summarizePositions(positions, 0).exposure).toBeNull();
  });

  it('should leave the long/short ratio empty without shorts', () => {
    expect(summarizePositions([makePosition({ szi: 1 })], 100).longShortRatio).toBeNull();
  });

  it('should treat positions without a mark price as zero notional', () => {
    expect(summarizePositions([makePosition({ markPx: null })], 100).totalNotional).toBe(0);
  });
});

describe('attributionByCoin', () => {
  it('should group PnL per coin, best first, excluding spot', () => {
    const result = attributionByCoin(
      [
        closingFill(-20, { coin: 'ETH' }),
        closingFill(50, { coin: 'BTC' }),
        closingFill(30, { coin: 'BTC', fee: 5 }),
        makeFill({ coin: '@1', dir: 'Buy' }),
      ],
      {},
    );

    expect(result.map(({ coin, netPnl }) => ({ coin, netPnl }))).toEqual([
      { coin: 'BTC', netPnl: 75 },
      { coin: 'ETH', netPnl: -20 },
    ]);
  });
});

describe('sideBreakdown', () => {
  it('should attribute closes to the side of the position being closed', () => {
    const fills = [
      closingFill(40, { startPosition: 1 }),
      closingFill(-10, { side: 'buy', dir: 'Close Short', startPosition: -1 }),
    ];

    expect(sideBreakdown(fills, 'long')).toMatchObject({ realizedPnl: 40, closingFills: 1 });
    expect(sideBreakdown(fills, 'short')).toMatchObject({ realizedPnl: -10, winRate: 0 });
  });
});

describe('topTrades', () => {
  const fills = [
    closingFill(5),
    closingFill(50),
    closingFill(-40),
    closingFill(-2),
    closingFill(20),
  ];

  it('should return the biggest winners in descending order', () => {
    expect(topTrades(fills, 'best', 2).map((fill) => fill.closedPnl)).toEqual([50, 20]);
  });

  it('should return the biggest losers, worst first', () => {
    expect(topTrades(fills, 'worst').map((fill) => fill.closedPnl)).toEqual([-40, -2]);
  });
});

describe('positionHistory', () => {
  it('should rebuild a closed long from its open and close fills', () => {
    const [trip] = positionHistory(
      [
        makeFill({ coin: 'SOL', side: 'buy', sz: 1, px: 100, time: 1_000, fee: 1 }),
        makeFill({
          coin: 'SOL',
          side: 'sell',
          sz: 1,
          px: 110,
          startPosition: 1,
          dir: 'Close Long',
          closedPnl: 10,
          time: 2_000,
          fee: 1,
        }),
      ],
      {},
    );

    expect(trip).toMatchObject({
      coin: 'SOL',
      side: 'long',
      status: 'closed',
      openedAt: 1_000,
      closedAt: 2_000,
      entryPx: 100,
      exitPx: 110,
      realizedPnl: 10,
      fees: 2,
      netPnl: 8,
      fillCount: 2,
      maxSize: 1,
      openedBeforeData: false,
    });
  });

  it('should split a flip into a closed long and a new open short', () => {
    const trips = positionHistory(
      [
        makeFill({ coin: 'ETH', side: 'buy', sz: 1, px: 100, time: 1_000 }),
        makeFill({
          coin: 'ETH',
          side: 'sell',
          sz: 2,
          px: 120,
          startPosition: 1,
          dir: 'Long > Short',
          closedPnl: 20,
          time: 2_000,
        }),
      ],
      {},
    );

    expect(trips.map(({ side, status }) => ({ side, status }))).toEqual(
      expect.arrayContaining([
        { side: 'long', status: 'closed' },
        { side: 'short', status: 'open' },
      ]),
    );
    expect(trips.find((trip) => trip.side === 'short')?.entryPx).toBe(120);
  });

  it('should keep an unclosed position open', () => {
    const [trip] = positionHistory([makeFill({ coin: 'BTC', side: 'buy', time: 1_000 })], {});

    expect(trip).toMatchObject({ status: 'open', closedAt: null });
  });

  it('should flag positions opened before the available history', () => {
    const [trip] = positionHistory(
      [makeFill({ coin: 'BTC', side: 'sell', startPosition: 3, dir: 'Close Long', time: 1_000 })],
      {},
    );

    expect(trip?.openedBeforeData).toBe(true);
  });

  it('should order fills that share a timestamp by chaining positions', () => {
    const [trip, ...rest] = positionHistory(
      [
        makeFill({ coin: 'BTC', side: 'buy', sz: 1, startPosition: 1, time: 5_000, tid: 900 }),
        makeFill({ coin: 'BTC', side: 'buy', sz: 1, startPosition: 0, time: 5_000, tid: 901 }),
      ],
      {},
    );

    expect(rest).toHaveLength(0);
    expect(trip).toMatchObject({
      status: 'open',
      openedBeforeData: false,
      fillCount: 2,
      maxSize: 2,
    });
  });

  it('should list the most recently active trips first', () => {
    const trips = positionHistory(
      [
        makeFill({ coin: 'BTC', side: 'buy', time: 1_000 }),
        makeFill({ coin: 'ETH', side: 'buy', time: 3_000 }),
      ],
      {},
    );

    expect(trips.map((trip) => trip.coin)).toEqual(['ETH', 'BTC']);
  });
});
