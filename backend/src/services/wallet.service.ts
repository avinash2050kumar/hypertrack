import {
  FILLS_PAGE_SIZE,
  PORTFOLIO_WINDOW_KEYS,
  SPARKLINE_POINTS,
  STABLECOINS,
} from '../data/index.js';
import {
  filterSince,
  flowAdjustedEquity,
  indexTo100,
  parseAddress,
  positionHistory,
  seriesChange,
  windowStart,
  type ApiErrorPayload,
  type ApiResponse,
  type BatchItem,
  type FillsPage,
  type FillsQuery,
  type PnlHistory,
  type Position,
  type PositionHistory,
  type ResponseMeta,
  type TimeWindow,
  type WalletOverview,
  type WalletPerformance,
  type WalletSummary,
} from '../domain/index.js';
import { toAppError } from '../lib/errors.js';
import type { Cached } from './cache.js';
import { FillHistory, mergeFills, oldestTime } from './fill-history.js';
import { type HyperliquidClient, type RawFill, type RawPortfolio } from './hyperliquid.js';
import {
  buildAccount,
  buildBreakdown,
  buildCharts,
  buildMetrics,
  downsample,
  type EquityInput,
} from './metrics.service.js';
import { combinePerpStates, toSeries, type PerpAccount } from './normalize.js';

function combineMeta(parts: readonly Cached<unknown>[]): ResponseMeta {
  return {
    cached: parts.every((part) => part.cached),
    asOf: Math.min(...parts.map((part) => part.asOf)),
  };
}

function equityFor(portfolio: RawPortfolio, window: TimeWindow): EquityInput {
  const raw = portfolio.get(PORTFOLIO_WINDOW_KEYS[window]);
  return {
    accountValue: toSeries(raw?.accountValueHistory ?? []),
    pnl: toSeries(raw?.pnlHistory ?? []),
  };
}

// The main market plus any HIP-3 market ('dex:COIN') the wallet has recent fills on.
function dexesTraded(fills: readonly RawFill[]): string[] {
  const dexes = fills.flatMap((fill) =>
    fill.coin.includes(':') ? [fill.coin.split(':')[0] ?? ''] : [],
  );
  return ['', ...new Set(dexes)];
}

function latestAccountValue(portfolio: RawPortfolio): number | null {
  const history = portfolio.get('day')?.accountValueHistory ?? [];
  const last = history[history.length - 1];
  return last ? last[1] : null;
}

export class WalletService {
  private readonly history: FillHistory;

  constructor(private readonly hl: HyperliquidClient) {
    this.history = new FillHistory(hl);
  }

  // Kept to cheap upstream calls so the detail page opens fast; deep fill history loads per tab.
  async overview(address: string, window: TimeWindow): Promise<ApiResponse<WalletOverview>> {
    const [perp, portfolio, prices, fillSet] = await Promise.all([
      this.perpAccount(address),
      this.hl.portfolio(address),
      this.hl.markPrices(),
      this.history.recentForWindow(address, window),
    ]);
    const { positions } = perp.value;
    const equity = equityFor(portfolio.value, window);
    const totalValue = await this.totalAccountValue(
      address,
      portfolio.value,
      perp.value.accountValue,
    );

    return {
      data: {
        address,
        window,
        account: buildAccount(perp.value, positions, totalValue),
        pnl24h: seriesChange(equityFor(portfolio.value, '24h').pnl),
        metrics: buildMetrics(fillSet.value.fills, prices.value, equity),
        positions,
        charts: buildCharts(window, equity),
        fills: fillSet.value.coverage,
      },
      meta: combineMeta([perp, portfolio, prices, fillSet]),
    };
  }

  async performance(address: string, window: TimeWindow): Promise<ApiResponse<WalletPerformance>> {
    const [portfolio, prices, fillSet] = await Promise.all([
      this.hl.portfolio(address),
      this.hl.markPrices(),
      this.history.forWindow(address, window),
    ]);
    const { fills, coverage } = fillSet.value;
    return {
      data: {
        address,
        window,
        metrics: buildMetrics(fills, prices.value, equityFor(portfolio.value, window)),
        ...buildBreakdown(fills, prices.value),
        fills: coverage,
      },
      meta: combineMeta([portfolio, prices, fillSet]),
    };
  }

  async positions(address: string): Promise<ApiResponse<Position[]>> {
    const perp = await this.perpAccount(address);
    return { data: perp.value.positions, meta: combineMeta([perp]) };
  }

  async positionHistory(
    address: string,
    window: TimeWindow,
  ): Promise<ApiResponse<PositionHistory>> {
    const [prices, fillSet] = await Promise.all([
      this.hl.markPrices(),
      this.history.forWindow(address, window),
    ]);
    return {
      data: {
        address,
        window,
        trips: positionHistory(fillSet.value.fills, prices.value),
        fills: fillSet.value.coverage,
      },
      meta: combineMeta([prices, fillSet]),
    };
  }

  async pnlHistory(address: string, window: TimeWindow): Promise<ApiResponse<PnlHistory>> {
    const portfolio = await this.hl.portfolio(address);
    return {
      data: { address, window, charts: buildCharts(window, equityFor(portfolio.value, window)) },
      meta: combineMeta([portfolio]),
    };
  }

  async fills(address: string, query: FillsQuery): Promise<ApiResponse<FillsPage>> {
    const { limit, before, after, coin } = query;
    const recent = await this.hl.userFills(address);
    const recentFills = mergeFills(recent.value);
    const recentOldest = oldestTime(recentFills);
    const reachesPastRecent =
      (before !== undefined && recentOldest !== null && before <= recentOldest) ||
      (after !== undefined && recentOldest !== null && after < recentOldest);
    const needsHistory = recent.value.length >= FILLS_PAGE_SIZE && reachesPastRecent;

    const source = needsHistory ? await this.history.forWindow(address, 'all') : null;
    const pool = source ? source.value.fills : recentFills;
    const eligible = pool.filter(
      (fill) =>
        (before === undefined || fill.time < before) &&
        (after === undefined || fill.time >= after) &&
        (coin === undefined || fill.coin === coin),
    );
    const page = eligible.slice(0, limit);
    const last = page[page.length - 1];
    const recentIsPartial = !source && recent.value.length >= FILLS_PAGE_SIZE;
    const hasMore = eligible.length > limit || (recentIsPartial && after === undefined);

    return {
      data: { fills: page, nextBefore: hasMore && last ? last.time : null },
      meta: combineMeta(source ? [recent, source] : [recent]),
    };
  }

  async batch(addresses: readonly string[], window: TimeWindow): Promise<BatchItem[]> {
    const unique = [...new Set(addresses.map((address) => address.trim().toLowerCase()))];
    return Promise.all(unique.map((input) => this.batchItem(input, window)));
  }

  private async batchItem(input: string, window: TimeWindow): Promise<BatchItem> {
    const address = parseAddress(input);
    if (!address) {
      return {
        address: input,
        ok: false,
        error: { code: 'INVALID_ADDRESS', message: 'Not a valid Hyperliquid address' },
      };
    }
    try {
      return { address, ok: true, summary: await this.summary(address, window) };
    } catch (error) {
      const payload: ApiErrorPayload = toAppError(error).toPayload();
      return { address, ok: false, error: payload };
    }
  }

  private async summary(address: string, window: TimeWindow): Promise<WalletSummary> {
    const [portfolio, prices, recent] = await Promise.all([
      this.hl.portfolio(address),
      this.hl.markPrices(),
      this.hl.userFills(address),
    ]);
    const perp = await this.perpAccount(address, dexesTraded(recent.value));
    const equity = equityFor(portfolio.value, window);
    const fills = filterSince(mergeFills(recent.value), windowStart(window, Date.now()));
    const metrics = buildMetrics(fills, prices.value, equity);
    return {
      address,
      accountValue: latestAccountValue(portfolio.value) ?? perp.value.accountValue,
      pnl24h: seriesChange(equityFor(portfolio.value, '24h').pnl),
      pnl7d: seriesChange(equityFor(portfolio.value, '7d').pnl),
      roi: metrics.roi,
      winRate: metrics.winRate,
      maxDrawdownPct: metrics.maxDrawdown.pct,
      openPositions: perp.value.positions.length,
      sparkline: downsample(
        indexTo100(flowAdjustedEquity(equity.accountValue, equity.pnl)),
        SPARKLINE_POINTS,
      ),
    };
  }

  // Queries every perp market by default; callers can narrow it to keep request weight down.
  private async perpAccount(
    address: string,
    dexes?: readonly string[],
  ): Promise<Cached<PerpAccount>> {
    const names = dexes ?? (await this.hl.perpDexs()).value.names;
    const [prices, ...states] = await Promise.all([
      this.hl.markPrices(),
      ...names.map((dex) => this.hl.clearinghouseState(address, dex)),
    ]);
    return {
      value: combinePerpStates(
        states.map((state) => state.value),
        prices.value,
      ),
      ...combineMeta([prices, ...states]),
    };
  }

  // Portfolio's latest point is Hyperliquid's own spot+perp total; fall back to perp + stablecoins.
  private async totalAccountValue(
    address: string,
    portfolio: RawPortfolio,
    perpValue: number,
  ): Promise<number> {
    const latest = latestAccountValue(portfolio);
    if (latest !== null) return latest;
    const spot = await this.hl.spotClearinghouseState(address);
    const stable = spot.value.balances
      .filter((balance) => STABLECOINS.has(balance.coin))
      .reduce((acc, balance) => acc + balance.total, 0);
    return perpValue + stable;
  }
}
