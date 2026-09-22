import type { LiveWalletState, Position, WalletOverview } from '../../src/domain';

export const ADDRESS = '0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4';
export const OTHER_ADDRESS = '0x0000000000000000000000000000000000000001';

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

export function makeLiveState(overrides: Partial<LiveWalletState> = {}): LiveWalletState {
  return {
    address: ADDRESS,
    at: 1_700_000_000_000,
    perpAccountValue: 800,
    marginUsed: 40,
    withdrawable: 700,
    positions: [makePosition()],
    ...overrides,
  };
}

export function withAccount(
  overview: WalletOverview,
  account: Partial<WalletOverview['account']>,
): WalletOverview {
  return { ...overview, account: { ...overview.account, ...account } };
}

export function makeOverview(overrides: Partial<WalletOverview> = {}): WalletOverview {
  return {
    address: ADDRESS,
    window: '7d',
    account: {
      accountValue: 1_500,
      perpAccountValue: 1_000,
      spotValue: 500,
      marginUsed: 50,
      withdrawable: 900,
      totalNotional: 0,
      longNotional: 0,
      shortNotional: 0,
      exposure: null,
      longShortRatio: null,
      unrealizedPnl: 0,
    },
    pnl24h: 0,
    metrics: {
      realizedPnl: 0,
      fees: 0,
      netPnl: 0,
      volume: 0,
      closingFills: 0,
      wins: 0,
      losses: 0,
      grossProfit: 0,
      grossLoss: 0,
      winRate: null,
      profitFactor: null,
      avgWin: null,
      avgLoss: null,
      expectancy: null,
      avgHoldTimeMs: null,
      pnl: 0,
      roi: null,
      maxDrawdown: { abs: 0, pct: 0 },
      sharpe: null,
    },
    positions: [],
    charts: { accountValue: [], pnl: [], pnlBars: [], equityIndex: [], drawdown: [] },
    fills: { count: 0, truncated: false, oldest: null },
    ...overrides,
  };
}
