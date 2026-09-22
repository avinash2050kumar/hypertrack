import {
  CURSOR_ROUNDING_MS,
  FILLS_PAGE_SIZE,
  MAX_FILL_PAGES,
  MIN_SPAN_MS,
  SPAN_LADDER_MS,
  TARGET_PAGE_FILLS,
  TARGET_WINDOW_FILLS,
} from '../data/index.js';
import {
  filterSince,
  windowStart,
  type Fill,
  type FillCoverage,
  type TimeWindow,
} from '../domain/index.js';
import type { Cached } from './cache.js';
import type { HyperliquidClient, RawFill } from './hyperliquid.js';
import { toFill } from './normalize.js';

interface FillSet {
  fills: Fill[];
  coverage: FillCoverage;
}

export function mergeFills(...groups: readonly RawFill[][]): Fill[] {
  const byTid = new Map<number, RawFill>();
  for (const group of groups) for (const fill of group) byTid.set(fill.tid, fill);
  return [...byTid.values()].map(toFill).sort((a, b) => b.time - a.time || b.tid - a.tid);
}

export function oldestTime(fills: readonly { time: number }[]): number | null {
  return fills.length ? Math.min(...fills.map((fill) => fill.time)) : null;
}

function roundDown(t: number): number {
  return Math.floor(t / CURSOR_ROUNDING_MS) * CURSOR_ROUNDING_MS;
}

function roundUp(t: number): number {
  return Math.ceil(t / CURSOR_ROUNDING_MS) * CURSOR_ROUNDING_MS;
}

function fillDensity(fills: readonly RawFill[]): number {
  const times = fills.map((fill) => fill.time);
  const span = Math.max(Math.max(...times) - Math.min(...times), CURSOR_ROUNDING_MS);
  return Math.max(fills.length, 1) / span;
}

function pickSpan(idealMs: number): number {
  const fitting = SPAN_LADDER_MS.filter((span) => span <= idealMs);
  return fitting[fitting.length - 1] ?? MIN_SPAN_MS;
}

function toFillSet(all: Fill[], start: number, truncated: boolean): FillSet {
  const fills = filterSince(all, start);
  return { fills, coverage: { count: fills.length, truncated, oldest: oldestTime(fills) } };
}

export class FillHistory {
  constructor(private readonly hl: HyperliquidClient) {}

  // One request: the latest 2000 fills, clipped to the window. Truncated if they don't reach its start.
  async recentForWindow(address: string, window: TimeWindow): Promise<Cached<FillSet>> {
    const start = windowStart(window, Date.now());
    const recent = await this.hl.userFills(address);
    const recentOldest = oldestTime(recent.value);
    const truncated =
      recent.value.length >= FILLS_PAGE_SIZE && recentOldest !== null && recentOldest > start;
    return { ...recent, value: toFillSet(mergeFills(recent.value), start, truncated) };
  }

  // Pages back through history until the window is covered or the fill budget is spent.
  async forWindow(address: string, window: TimeWindow): Promise<Cached<FillSet>> {
    const start = windowStart(window, Date.now());
    const recent = await this.hl.userFills(address);
    const recentOldest = oldestTime(recent.value);
    const complete =
      recent.value.length < FILLS_PAGE_SIZE || (recentOldest !== null && recentOldest <= start);
    if (complete) return { ...recent, value: toFillSet(mergeFills(recent.value), start, false) };

    const paged = await this.pageBackwards(address, start, recent.value);
    return {
      value: toFillSet(mergeFills(recent.value, paged.fills), start, paged.truncated),
      cached: recent.cached && paged.cached,
      asOf: Math.min(recent.asOf, paged.asOf),
    };
  }

  // userFillsByTime returns the oldest fills in a range first, so each page asks for a span sized
  // to hold fewer than 2000 fills; that keeps the sample contiguous back from the newest fill.
  private async pageBackwards(address: string, start: number, recent: readonly RawFill[]) {
    const fills: RawFill[] = [];
    const floor = roundDown(start);
    let end = roundUp(oldestTime(recent) ?? Date.now());
    let density = fillDensity(recent);
    let cached = true;
    let asOf = Date.now();

    for (let page = 0; page < MAX_FILL_PAGES && end > floor; page += 1) {
      if (recent.length + fills.length >= TARGET_WINDOW_FILLS) break;
      const span = pickSpan(TARGET_PAGE_FILLS / density);
      const from = Math.max(floor, roundDown(end - span));
      const result = await this.hl.userFillsByTime(address, from, end);
      cached &&= result.cached;
      asOf = Math.min(asOf, result.asOf);
      const batch = result.value.fills;
      if (batch.length >= FILLS_PAGE_SIZE) {
        if (span <= MIN_SPAN_MS) break;
        density = (batch.length * 2) / (end - from);
        continue;
      }
      fills.push(...batch);
      density = Math.max(batch.length, 1) / (end - from);
      end = from;
    }
    return { fills, cached, asOf, truncated: end > floor };
  }
}
