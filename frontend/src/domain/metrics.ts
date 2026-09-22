import type { AccountSnapshot, LiveWalletState, Position, WalletOverview } from './types';

type PricedPosition = Pick<Position, 'szi' | 'markPx'>;

function sum(values: readonly number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function notional(position: PricedPosition): number {
  return position.markPx === null ? 0 : Math.abs(position.szi * position.markPx);
}

function sideNotional(positions: readonly PricedPosition[], long: boolean): number {
  return sum(positions.filter((p) => (long ? p.szi > 0 : p.szi < 0)).map(notional));
}

// Mirrors backend summarizePositions so live pushes produce the same numbers as REST.
function summarizePositions(
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
  const totalNotional = longNotional + shortNotional;
  const exposure = accountValue > 0 ? totalNotional / accountValue : null;
  return {
    totalNotional,
    longNotional,
    shortNotional,
    exposure: exposure !== null && Number.isFinite(exposure) ? exposure : null,
    longShortRatio: shortNotional === 0 ? null : longNotional / shortNotional,
    unrealizedPnl: sum(positions.map((p) => p.unrealizedPnl)),
  };
}

// Spot balances aren't in the live stream, so shift the snapshot total by the perp account's change.
export function applyLiveState(overview: WalletOverview, live: LiveWalletState): WalletOverview {
  const accountValue =
    overview.account.accountValue - overview.account.perpAccountValue + live.perpAccountValue;
  return {
    ...overview,
    positions: live.positions,
    account: {
      ...overview.account,
      accountValue,
      perpAccountValue: live.perpAccountValue,
      marginUsed: live.marginUsed,
      withdrawable: live.withdrawable,
      ...summarizePositions(live.positions, accountValue),
    },
  };
}
