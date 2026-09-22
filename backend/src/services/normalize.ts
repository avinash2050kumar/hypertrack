import type { Fill, LiveWalletState, Position, SeriesPoint } from '../domain/index.js';
import type { MarkPrices, RawClearinghouseState, RawFill, RawPosition } from './hyperliquid.js';

export function toFill(raw: RawFill): Fill {
  return {
    tid: raw.tid,
    hash: raw.hash,
    coin: raw.coin,
    px: raw.px,
    sz: raw.sz,
    side: raw.side === 'B' ? 'buy' : 'sell',
    dir: raw.dir,
    time: raw.time,
    startPosition: raw.startPosition,
    closedPnl: raw.closedPnl,
    fee: raw.fee,
    feeToken: raw.feeToken,
    crossed: raw.crossed,
  };
}

function impliedMark(raw: RawPosition): number | null {
  return raw.szi === 0 ? null : raw.positionValue / Math.abs(raw.szi);
}

function toPosition(raw: RawPosition, prices: MarkPrices = {}): Position {
  return {
    coin: raw.coin,
    side: raw.szi >= 0 ? 'long' : 'short',
    szi: raw.szi,
    size: Math.abs(raw.szi),
    entryPx: raw.entryPx ?? 0,
    markPx: prices[raw.coin] ?? impliedMark(raw),
    positionValue: raw.positionValue,
    unrealizedPnl: raw.unrealizedPnl,
    returnOnEquity: raw.returnOnEquity,
    liquidationPx: raw.liquidationPx,
    leverage: raw.leverage.value,
    leverageType: raw.leverage.type,
    marginUsed: raw.marginUsed,
    fundingSinceOpen: raw.cumFunding?.sinceOpen ?? 0,
  };
}

export interface PerpAccount {
  accountValue: number;
  marginUsed: number;
  withdrawable: number;
  positions: Position[];
  time: number;
}

// Sums every perp market's clearinghouse into one account view.
export function combinePerpStates(
  states: readonly RawClearinghouseState[],
  prices: MarkPrices = {},
): PerpAccount {
  const sum = (pick: (state: RawClearinghouseState) => number) =>
    states.reduce((acc, state) => acc + pick(state), 0);
  return {
    accountValue: sum((state) => state.marginSummary.accountValue),
    marginUsed: sum((state) => state.marginSummary.totalMarginUsed),
    withdrawable: sum((state) => state.withdrawable),
    positions: states
      .flatMap((state) => state.assetPositions.map(({ position }) => toPosition(position, prices)))
      .filter((position) => position.szi !== 0)
      .sort((a, b) => b.positionValue - a.positionValue),
    time: Math.max(0, ...states.map((state) => state.time ?? 0)) || Date.now(),
  };
}

export function toSeries(points: readonly (readonly [number, number])[]): SeriesPoint[] {
  return points.map(([t, v]) => ({ t, v }));
}

export function toLiveState(
  address: string,
  states: readonly RawClearinghouseState[],
): LiveWalletState {
  const perp = combinePerpStates(states);
  return {
    address,
    at: perp.time,
    perpAccountValue: perp.accountValue,
    marginUsed: perp.marginUsed,
    withdrawable: perp.withdrawable,
    positions: perp.positions,
  };
}
