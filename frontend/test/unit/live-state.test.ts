import { describe, expect, it } from 'vitest';

import { applyLiveState } from '../../src/domain';
import { makeLiveState, makeOverview, makePosition } from '../utils/fixtures';

describe('applyLiveState', () => {
  it('should keep spot value and move the total by the perp account change', () => {
    const result = applyLiveState(makeOverview(), makeLiveState({ perpAccountValue: 1_200 }));

    expect(result.account).toMatchObject({
      accountValue: 1_700,
      perpAccountValue: 1_200,
      spotValue: 500,
    });
  });

  it('should replace positions and margin figures with the live values', () => {
    const live = makeLiveState({ marginUsed: 99, withdrawable: 123 });

    const result = applyLiveState(makeOverview(), live);

    expect(result.positions).toBe(live.positions);
    expect(result.account).toMatchObject({ marginUsed: 99, withdrawable: 123 });
  });

  it('should recompute exposure from live positions', () => {
    const live = makeLiveState({
      perpAccountValue: 1_000,
      positions: [
        makePosition({ szi: 2, markPx: 100, unrealizedPnl: 5 }),
        makePosition({ coin: 'ETH', szi: -1, markPx: 50, unrealizedPnl: -2 }),
      ],
    });

    const { account } = applyLiveState(makeOverview(), live);

    expect(account).toMatchObject({
      longNotional: 200,
      shortNotional: 50,
      totalNotional: 250,
      exposure: 250 / 1_500,
      longShortRatio: 4,
      unrealizedPnl: 3,
    });
  });

  it('should leave exposure and ratio empty when they are undefined', () => {
    const live = makeLiveState({ perpAccountValue: -500, positions: [makePosition({ szi: 1 })] });

    const { account } = applyLiveState(makeOverview(), live);

    expect(account.exposure).toBeNull();
    expect(account.longShortRatio).toBeNull();
  });

  it('should not touch unrelated overview data', () => {
    const overview = makeOverview({ pnl24h: 42 });

    const result = applyLiveState(overview, makeLiveState());

    expect(result.pnl24h).toBe(42);
    expect(result.metrics).toBe(overview.metrics);
    expect(result.charts).toBe(overview.charts);
  });
});
