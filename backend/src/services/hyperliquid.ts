import { z } from 'zod';

import type { Config } from '../config.js';
import {
  DEFAULT_REQUEST_WEIGHT,
  DEFAULT_RETRY_AFTER_SEC,
  ITEMS_PER_EXTRA_WEIGHT,
  LIGHT_REQUEST_WEIGHT,
  MAX_BUDGET_WAIT_MS,
  PERP_DEXS_TTL_MS,
  REQUEST_TIMEOUT_MS,
  RETRY_DELAYS_MS,
} from '../data/index.js';
import { UpstreamError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { TtlCache, type Cached } from './cache.js';

const decimal = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Not a number: ${value}` });
  return z.NEVER;
});
const nullableDecimal = z
  .union([decimal, z.null()])
  .optional()
  .transform((value) => value ?? null);

const marginSummarySchema = z.object({
  accountValue: decimal,
  totalNtlPos: decimal,
  totalMarginUsed: decimal,
});

const rawPositionSchema = z.object({
  coin: z.string(),
  szi: decimal,
  entryPx: nullableDecimal,
  positionValue: decimal,
  unrealizedPnl: decimal,
  returnOnEquity: decimal,
  liquidationPx: nullableDecimal,
  marginUsed: decimal,
  leverage: z.object({ type: z.enum(['cross', 'isolated']), value: z.number() }),
  cumFunding: z.object({ sinceOpen: decimal }).optional(),
});

export const clearinghouseStateSchema = z.object({
  marginSummary: marginSummarySchema,
  withdrawable: decimal,
  assetPositions: z.array(z.object({ position: rawPositionSchema })),
  time: z.number().optional(),
});

const spotStateSchema = z.object({
  balances: z.array(z.object({ coin: z.string(), total: decimal, entryNtl: decimal })),
});

const pointSchema = z.tuple([z.number(), decimal]);
const portfolioWindowSchema = z.object({
  accountValueHistory: z.array(pointSchema),
  pnlHistory: z.array(pointSchema),
  vlm: decimal,
});
const portfolioSchema = z.array(z.tuple([z.string(), portfolioWindowSchema]));

const rawFillSchema = z.object({
  coin: z.string(),
  px: decimal,
  sz: decimal,
  side: z.enum(['A', 'B']),
  time: z.number(),
  startPosition: decimal,
  dir: z.string(),
  closedPnl: decimal,
  hash: z.string(),
  tid: z.number(),
  crossed: z.boolean(),
  fee: decimal,
  feeToken: z.string(),
});
const fillsSchema = z.array(rawFillSchema);

const metaAndCtxsSchema = z.tuple([
  z.object({ universe: z.array(z.object({ name: z.string() })) }),
  z.array(z.object({ markPx: nullableDecimal })),
]);

const perpDexsSchema = z.array(z.union([z.null(), z.object({ name: z.string() })]));

export type RawClearinghouseState = z.infer<typeof clearinghouseStateSchema>;
export type RawPosition = z.infer<typeof rawPositionSchema>;
type RawSpotState = z.infer<typeof spotStateSchema>;
type RawPortfolioWindow = z.infer<typeof portfolioWindowSchema>;
export type RawPortfolio = Map<string, RawPortfolioWindow>;
export type RawFill = z.infer<typeof rawFillSchema>;
export type MarkPrices = Record<string, number>;
interface FillPage {
  fills: RawFill[];
}

type FetchLike = typeof fetch;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mirrors Hyperliquid's per-IP weight limit so we queue locally instead of eating 429s.
class WeightBudget {
  private tokens: number;
  private updatedAt = Date.now();

  constructor(private readonly perMinute: number) {
    this.tokens = perMinute;
  }

  private refill(): void {
    const now = Date.now();
    this.tokens = Math.min(
      this.perMinute,
      this.tokens + ((now - this.updatedAt) * this.perMinute) / 60_000,
    );
    this.updatedAt = now;
  }

  async take(weight: number): Promise<void> {
    this.refill();
    this.tokens -= weight;
    if (this.tokens >= 0) return;
    const waitMs = Math.ceil((-this.tokens / this.perMinute) * 60_000);
    if (waitMs > MAX_BUDGET_WAIT_MS) {
      this.tokens += weight;
      throw new UpstreamError('UPSTREAM_RATE_LIMITED', 'Hyperliquid request budget exhausted', {
        retryAfterSec: Math.ceil(waitMs / 1000),
      });
    }
    await sleep(waitMs);
  }

  charge(weight: number): void {
    this.refill();
    this.tokens -= weight;
  }
}

class RetryableError extends Error {}

interface HyperliquidClientOptions {
  config: Pick<
    Config,
    | 'HL_API_URL'
    | 'CACHE_TTL_POSITIONS'
    | 'CACHE_TTL_PORTFOLIO'
    | 'CACHE_TTL_FILLS'
    | 'CACHE_TTL_FILLS_PAGED'
    | 'CACHE_TTL_META'
    | 'HL_WEIGHT_PER_MIN'
  >;
  logger: Logger;
  fetch?: FetchLike;
}

export class HyperliquidClient {
  private readonly fetchImpl: FetchLike;
  private readonly budget: WeightBudget;
  private readonly clearinghouseCache: TtlCache<RawClearinghouseState>;
  private readonly spotCache: TtlCache<RawSpotState>;
  private readonly portfolioCache: TtlCache<RawPortfolio>;
  private readonly fillsCache: TtlCache<RawFill[]>;
  private readonly pagedFillsCache: TtlCache<FillPage>;
  private readonly metaCache: TtlCache<MarkPrices>;
  private readonly dexCache = new TtlCache<{ names: string[] }>(PERP_DEXS_TTL_MS);

  constructor(private readonly options: HyperliquidClientOptions) {
    const { config } = options;
    this.fetchImpl = options.fetch ?? fetch;
    this.budget = new WeightBudget(config.HL_WEIGHT_PER_MIN);
    this.clearinghouseCache = new TtlCache(config.CACHE_TTL_POSITIONS);
    this.spotCache = new TtlCache(config.CACHE_TTL_POSITIONS);
    this.portfolioCache = new TtlCache(config.CACHE_TTL_PORTFOLIO);
    this.fillsCache = new TtlCache(config.CACHE_TTL_FILLS);
    this.pagedFillsCache = new TtlCache(config.CACHE_TTL_FILLS_PAGED);
    this.metaCache = new TtlCache(config.CACHE_TTL_META);
  }

  // HIP-3 builder markets each have their own clearinghouse; '' is the main perp market.
  clearinghouseState(user: string, dex = ''): Promise<Cached<RawClearinghouseState>> {
    const body = dex
      ? { type: 'clearinghouseState', user, dex }
      : { type: 'clearinghouseState', user };
    return this.cachedInfo(this.clearinghouseCache, body, LIGHT_REQUEST_WEIGHT, (raw) =>
      clearinghouseStateSchema.parse(raw),
    );
  }

  perpDexs(): Promise<Cached<{ names: string[] }>> {
    return this.cachedInfo(this.dexCache, { type: 'perpDexs' }, DEFAULT_REQUEST_WEIGHT, (raw) => ({
      names: perpDexsSchema.parse(raw).map((dex) => dex?.name ?? ''),
    }));
  }

  spotClearinghouseState(user: string): Promise<Cached<RawSpotState>> {
    return this.cachedInfo(
      this.spotCache,
      { type: 'spotClearinghouseState', user },
      LIGHT_REQUEST_WEIGHT,
      (raw) => spotStateSchema.parse(raw),
    );
  }

  portfolio(user: string): Promise<Cached<RawPortfolio>> {
    return this.cachedInfo(
      this.portfolioCache,
      { type: 'portfolio', user },
      DEFAULT_REQUEST_WEIGHT,
      (raw) => new Map(portfolioSchema.parse(raw)),
    );
  }

  userFills(user: string): Promise<Cached<RawFill[]>> {
    return this.cachedInfo(
      this.fillsCache,
      { type: 'userFills', user },
      DEFAULT_REQUEST_WEIGHT,
      (raw) => this.chargeForItems(fillsSchema.parse(raw)),
    );
  }

  userFillsByTime(user: string, startTime: number, endTime: number): Promise<Cached<FillPage>> {
    const body = { type: 'userFillsByTime', user, startTime, endTime };
    return this.cachedInfo(this.pagedFillsCache, body, DEFAULT_REQUEST_WEIGHT, (raw) => ({
      fills: this.chargeForItems(fillsSchema.parse(raw)),
    }));
  }

  markPrices(): Promise<Cached<MarkPrices>> {
    return this.cachedInfo(
      this.metaCache,
      { type: 'metaAndAssetCtxs' },
      DEFAULT_REQUEST_WEIGHT,
      (raw) => {
        const [meta, ctxs] = metaAndCtxsSchema.parse(raw);
        const prices: MarkPrices = {};
        meta.universe.forEach((asset, i) => {
          const markPx = ctxs[i]?.markPx;
          if (markPx !== null && markPx !== undefined) prices[asset.name] = markPx;
        });
        return prices;
      },
    );
  }

  private chargeForItems<T>(items: T[]): T[] {
    this.budget.charge(Math.floor(items.length / ITEMS_PER_EXTRA_WEIGHT));
    return items;
  }

  private cachedInfo<V extends object>(
    cache: TtlCache<V>,
    body: Record<string, unknown>,
    weight: number,
    parse: (raw: unknown) => V,
  ): Promise<Cached<V>> {
    return cache.getOrLoad(JSON.stringify(body), async () => {
      const raw = await this.post(body, weight);
      try {
        return parse(raw);
      } catch (error) {
        this.options.logger.error(
          { err: error, type: body.type },
          'unexpected Hyperliquid response shape',
        );
        throw new UpstreamError(
          'UPSTREAM_BAD_RESPONSE',
          'Hyperliquid returned data in an unexpected shape',
        );
      }
    });
  }

  private async post(body: Record<string, unknown>, weight: number): Promise<unknown> {
    await this.budget.take(weight);
    this.options.logger.debug({ body }, 'hyperliquid request');
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.attempt(body);
      } catch (error) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (!(error instanceof RetryableError) || delay === undefined) throw this.finalError(error);
        this.options.logger.warn(
          { type: body.type, attempt: attempt + 1, reason: error.message },
          'retrying Hyperliquid request',
        );
        await sleep(delay);
      }
    }
  }

  private async attempt(body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(this.options.config.HL_API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return await this.readResponse(response);
    } catch (error) {
      if (error instanceof UpstreamError || error instanceof RetryableError) throw error;
      throw new RetryableError(controller.signal.aborted ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
  }

  private async readResponse(response: Response): Promise<unknown> {
    if (response.status >= 500) throw new RetryableError(`status ${response.status}`);
    if (response.status === 429) {
      throw new UpstreamError('UPSTREAM_RATE_LIMITED', 'Hyperliquid is rate limiting requests', {
        retryAfterSec: Number(response.headers.get('retry-after')) || DEFAULT_RETRY_AFTER_SEC,
      });
    }
    if (!response.ok) {
      throw new UpstreamError(
        'UPSTREAM_REJECTED',
        `Hyperliquid rejected the request (${response.status})`,
        {
          upstreamStatus: response.status,
          body: (await response.text()).slice(0, 200),
        },
      );
    }
    return response.json();
  }

  private finalError(error: unknown): Error {
    if (error instanceof UpstreamError) return error;
    if (error instanceof RetryableError && error.message === 'timeout') {
      return new UpstreamError('UPSTREAM_TIMEOUT', 'Hyperliquid did not respond in time');
    }
    return new UpstreamError('UPSTREAM_UNAVAILABLE', 'Hyperliquid API is unreachable right now');
  }
}
