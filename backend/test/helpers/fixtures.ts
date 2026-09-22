import type { Fill, Position, SeriesPoint } from '../../src/domain/index.js';
import type { RawClearinghouseState } from '../../src/services/hyperliquid.js';

export const ADDRESS = '0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4';
export const OTHER_ADDRESS = '0x0000000000000000000000000000000000000001';
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

let nextTid = 1;

export function makeFill(overrides: Partial<Fill> = {}): Fill {
  const tid = nextTid++;
  return {
    tid,
    hash: `0xhash${tid}`,
    coin: 'BTC',
    px: 100,
    sz: 1,
    side: 'buy',
    dir: 'Open Long',
    time: tid * 1_000,
    startPosition: 0,
    closedPnl: 0,
    fee: 0,
    feeToken: 'USDC',
    crossed: true,
    ...overrides,
  };
}

export function closingFill(closedPnl: number, overrides: Partial<Fill> = {}): Fill {
  return makeFill({
    side: 'sell',
    dir: 'Close Long',
    startPosition: 1,
    closedPnl,
    ...overrides,
  });
}

export function makeSeries(values: readonly number[], stepMs = DAY, start = 0): SeriesPoint[] {
  return values.map((v, i) => ({ t: start + i * stepMs, v }));
}

export function makePosition(overrides: Partial<Position> = {}): Position {
  const szi = overrides.szi ?? 1;
  return {
    coin: 'BTC',
    side: szi >= 0 ? 'long' : 'short',
    szi,
    size: Math.abs(szi),
    entryPx: 100,
    markPx: 110,
    positionValue: Math.abs(szi) * 110,
    unrealizedPnl: 10,
    returnOnEquity: 0.1,
    liquidationPx: null,
    leverage: 5,
    leverageType: 'cross',
    marginUsed: 22,
    fundingSinceOpen: 0,
    ...overrides,
  };
}

export function rawClearinghouse(
  positions: { coin: string; szi: number; value: number; pnl?: number }[] = [],
  accountValue = 1_000,
): RawClearinghouseState {
  return {
    marginSummary: { accountValue, totalNtlPos: 0, totalMarginUsed: 50 },
    withdrawable: 900,
    time: 1_700_000_000_000,
    assetPositions: positions.map(({ coin, szi, value, pnl = 0 }) => ({
      position: {
        coin,
        szi,
        entryPx: value / Math.abs(szi),
        positionValue: value,
        unrealizedPnl: pnl,
        returnOnEquity: 0,
        liquidationPx: null,
        marginUsed: value / 5,
        leverage: { type: 'cross', value: 5 },
      },
    })),
  };
}
