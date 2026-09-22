import { vi } from 'vitest';

type InfoBody = { type: string } & Record<string, unknown>;
type Handler = (body: InfoBody) => Response | Promise<Response>;

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

export function hyperliquidFetch(handlers: Record<string, Handler>) {
  return vi.fn<typeof fetch>(async (_url, init) => {
    const body: InfoBody = JSON.parse(String(init?.body));
    const handler = handlers[body.type];
    if (!handler) return json({ error: `unhandled ${body.type}` }, { status: 422 });
    return handler(body);
  });
}

const NOW = Date.now();
const point = (offsetMs: number, value: number) => [NOW - offsetMs, String(value)];

function portfolioWindow(values: readonly number[]) {
  const step = 3_600_000;
  return {
    accountValueHistory: values.map((v, i) => point((values.length - 1 - i) * step, v)),
    pnlHistory: values.map((v, i) => point((values.length - 1 - i) * step, v - (values[0] ?? 0))),
    vlm: '0',
  };
}

export function fakeHyperliquid(overrides: Record<string, Handler> = {}) {
  return hyperliquidFetch({
    perpDexs: () => json([null]),
    metaAndAssetCtxs: () => json([{ universe: [{ name: 'BTC' }] }, [{ markPx: '110' }]]),
    clearinghouseState: () =>
      json({
        marginSummary: { accountValue: '1000', totalNtlPos: '220', totalMarginUsed: '44' },
        withdrawable: '900',
        time: NOW,
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '2',
              entryPx: '100',
              positionValue: '220',
              unrealizedPnl: '20',
              returnOnEquity: '0.45',
              liquidationPx: null,
              marginUsed: '44',
              leverage: { type: 'cross', value: 5 },
            },
          },
        ],
      }),
    portfolio: () =>
      json(
        ['day', 'week', 'month', 'allTime'].map((key) => [
          key,
          portfolioWindow([1000, 1050, 1100]),
        ]),
      ),
    userFills: () => json([]),
    userFillsByTime: () => json([]),
    spotClearinghouseState: () => json({ balances: [] }),
    ...overrides,
  });
}
