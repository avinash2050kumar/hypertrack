# API

The backend is a thin layer over Hyperliquid's public `/info` API. It cleans up the responses, works out the trading metrics the UI shows, caches aggressively, and streams live positions over a WebSocket so the browser doesn't have to talk to Hyperliquid directly.

Locally it runs on `http://localhost:8787`. In production it's wherever you've deployed it; ours is `https://hypertrack-bvh0.onrender.com`.

There's no auth. Everything here is public on-chain data, and every endpoint is read-only.

## Quick start

```bash
curl http://localhost:8787/api/health

curl "http://localhost:8787/api/wallets/0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4/overview?window=30d"
```

## The basics

A few things hold for every endpoint, so they're covered once here.

Addresses are `0x` plus 40 hex characters. Upper or lower case both work, but you'll always get lowercase back. Timestamps are Unix milliseconds. Money is in USD. Percentages come back as fractions, so a `roi` of `0.25` means 25%.

When something can't be calculated, like a win rate for a wallet that's never closed a trade, you get `null` rather than `0`. Please don't render those as zero.

Most endpoints take a `window` of `24h`, `7d`, `30d` or `all`. If you leave it out, you get `7d`.

Successful responses look like this:

```json
{
  "data": { "...": "..." },
  "meta": { "cached": true, "asOf": 1790072050365 }
}
```

`meta.asOf` tells you how fresh the data is: it's when the oldest part of it was fetched from Hyperliquid. `meta.cached` is `true` only if the whole response came out of cache.

Errors always have the same shape, so you can handle them in one place:

```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Address must be 0x followed by 40 hex characters",
    "details": [{ "path": "address", "message": "Expected a 0x-prefixed 40-character hex address" }]
  }
}
```

Every response also has an `x-request-id` header. Send your own (up to 128 characters) and we'll use it in the logs, which is handy when you're chasing down a bug report.

## Endpoints

### Health

`GET /api/health` returns `{ status, uptimeSec, liveSubscriptions }` and isn't rate limited, so point your platform's health check at it. `liveSubscriptions` is how many wallets are being streamed from Hyperliquid right now.

### Wallet overview

`GET /api/wallets/:address/overview?window=7d`

This is the one the wallet page loads first. It returns the account snapshot (total value, perp vs spot, margin, exposure), headline metrics for the window, open positions, chart series and 24h PnL. `pnl24h` is always the last 24 hours, whatever window you ask for.

```json
{
  "data": {
    "address": "0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4",
    "window": "30d",
    "account": {
      "accountValue": 10601944.54,
      "perpAccountValue": 2796775.41,
      "spotValue": 7805169.13
    },
    "pnl24h": 48211.9,
    "metrics": {
      "roi": 0.042,
      "winRate": 0.61,
      "sharpe": 1.8,
      "maxDrawdown": { "abs": 120400, "pct": 0.031 }
    },
    "positions": [],
    "charts": { "accountValue": [], "pnl": [], "pnlBars": [], "equityIndex": [], "drawdown": [] },
    "fills": { "count": 2000, "truncated": false, "oldest": 1787480050365 }
  },
  "meta": { "cached": false, "asOf": 1790072050365 }
}
```

(Trimmed. The real response has more fields.)

To keep this endpoint quick, the trade metrics only look at the wallet's latest 2,000 fills. For busy wallets that won't cover a whole `30d` or `all` window, and `fills.truncated` will be `true`. If you need the full picture, use `/performance`.

### Performance

`GET /api/wallets/:address/performance?window=7d`

Same metrics as the overview, but it pages back through older fills to cover the window properly. On top of that you get PnL broken down by coin (best first), separate long and short stats, and the five best and worst trades.

It's slower on a first request for an active wallet, since it may need several calls to Hyperliquid. After that it's cached.

### Positions

`GET /api/wallets/:address/positions`

Open perp positions across every market, including HIP-3 builder markets (those show up as `dex:COIN`), largest first.

```json
{
  "coin": "BTC",
  "side": "long",
  "szi": 2,
  "size": 2,
  "entryPx": 100,
  "markPx": 110,
  "positionValue": 220,
  "unrealizedPnl": 20,
  "returnOnEquity": 0.45,
  "liquidationPx": null,
  "leverage": 5,
  "leverageType": "cross",
  "marginUsed": 44,
  "fundingSinceOpen": 0
}
```

`szi` is signed (negative for shorts); `size` is the same number without the sign.

### Position history

`GET /api/wallets/:address/position-history?window=7d`

Hyperliquid only gives us individual fills, so this endpoint stitches them back together into positions: when each one opened and closed, average entry and exit, size and PnL. If a wallet flips from long to short in one fill, you'll see that as two separate trips.

Watch out for `openedBeforeData`. It means the position was already open before the first fill we have for the window, so its entry price and open time aren't reliable.

### PnL history

`GET /api/wallets/:address/pnl-history?window=7d`

Just the chart series from the overview, without everything else. Useful when someone switches the time window and you only need to redraw the charts.

The series you get:

- `accountValue`: account value over time, straight from Hyperliquid
- `pnl`: cumulative PnL
- `pnlBars`: PnL per hour for `24h`, per day for longer windows
- `equityIndex`: equity starting at 100, with deposits and withdrawals stripped out
- `drawdown`: how far below its previous peak the account is, as a fraction between 0 and −1

### Fills

`GET /api/wallets/:address/fills`

Individual trades, newest first.

| Param    | Default | Notes                                     |
| -------- | ------- | ----------------------------------------- |
| `limit`  | 100     | 1 to 500                                  |
| `before` |         | Only fills strictly before this timestamp |
| `after`  |         | Only fills at or after this timestamp     |
| `coin`   |         | One market, e.g. `BTC` or `xyz:TSLA`      |

Paging works off time, not offsets. Each response includes `nextBefore`; pass it back as `before` to get the next page. Once it comes back `null`, you've reached the end.

```bash
curl ".../fills?limit=100"
curl ".../fills?limit=100&before=1790073839773"
```

### Batch

`POST /api/wallets/batch`

Summaries for up to 25 wallets in one go. This is what powers the watchlist, and it's much kinder on rate limits than calling the overview 25 times.

```bash
curl -X POST http://localhost:8787/api/wallets/batch \
  -H 'content-type: application/json' \
  -d '{"addresses": ["0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4"], "window": "7d"}'
```

Duplicate addresses are merged, even if they differ in case or whitespace. Each wallet succeeds or fails on its own, so a typo in one address won't sink the whole request:

```json
{
  "data": {
    "window": "7d",
    "results": [
      {
        "address": "0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4",
        "ok": true,
        "summary": {
          "accountValue": 10601944.54,
          "pnl24h": 48211.9,
          "pnl7d": 310552.12,
          "roi": 0.031,
          "winRate": 0.58,
          "maxDrawdownPct": 0.024,
          "openPositions": 3,
          "sparkline": [{ "t": 1789467250365, "v": 100 }]
        }
      },
      {
        "address": "not-an-address",
        "ok": false,
        "error": { "code": "INVALID_ADDRESS", "message": "Not a valid Hyperliquid address" }
      }
    ]
  }
}
```

The `sparkline` has at most 32 points, indexed to 100 like `equityIndex`.

Heads up: a batch of 25 wallets nobody has looked up recently can take a few seconds. The backend deliberately slows down to stay inside Hyperliquid's limits instead of getting blocked.

## Live updates

Connect to `/ws/wallet/:address` (`wss://` in production) and the server pushes updates as that wallet's positions change:

```js
const socket = new WebSocket(`wss://hypertrack-bvh0.onrender.com/ws/wallet/${address}`);
socket.onmessage = (event) => handle(JSON.parse(event.data));
```

It's one-way; the server ignores anything you send. You'll see three kinds of message:

```jsonc
{ "type": "status", "status": "connected" }
{ "type": "snapshot", "data": { "address": "0x…", "at": 1790072050365, "perpAccountValue": 2796775.41, "marginUsed": 2983091.16, "withdrawable": 0, "positions": [] } }
{ "type": "error", "error": { "code": "LIVE_CAPACITY", "message": "Live updates are at capacity, falling back to polling" } }
```

If a snapshot is already cached when you connect, you get it straight away. After that, you get one each time the account changes. If the server loses its connection to Hyperliquid, it sends `{ "type": "status", "status": "reconnecting" }`, retries with backoff up to 30 seconds, and sends `connected` again once it's back.

Things that tripped us up:

- **Snapshots only cover the perp account.** Spot balances aren't streamed, so to update a wallet's total, add the change in `perpAccountValue` to the value you got from REST. Don't replace it.
- **There's a cap on how many wallets can be live at once** (`WS_MAX_UPSTREAM`, 10 by default). Past that, you get the `LIVE_CAPACITY` error and the socket closes with code 1013. Don't reconnect in a loop; fall back to polling REST.
- **Viewers of the same wallet share one upstream subscription**, so ten people watching one whale costs the same as one.
- **The server pings every 30 seconds** and drops clients that don't answer. Browsers handle this for you.
- **The status type in the code also includes `upstream-down`.** Nothing sends it yet, but treat any status other than `connected` as "not live".
- **This only works on a long-running server** like Render. The Vercel deployment has no WebSocket endpoint.

A bad path gets a `404` during the handshake, and a malformed address gets a `400`.

## Rate limits and caching

Each client IP gets 60 requests a minute across `/api` (`RATE_LIMIT_PER_MIN`). Batch requests have their own tighter limit of 10 a minute (`RATE_LIMIT_BATCH_PER_MIN`), and they count against the 60 as well. The health check is exempt.

Every response tells you where you stand with `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`. Go over and you get a `429` with a `Retry-After` header.

If the backend sits behind a load balancer (Render, Railway, Fly and so on), set `TRUST_PROXY=1`. Otherwise every visitor looks like the same IP and they all share one limit.

Responses are cached in memory per instance. Positions are cached for 5 seconds, mark prices for 30, portfolio history and recent fills for a minute, and older fill pages for 5 minutes. All of these are configurable; see `.env.example`. If several identical requests arrive together, they share a single call to Hyperliquid.

## Errors

| Status | Code                    | What happened                                                          |
| ------ | ----------------------- | ---------------------------------------------------------------------- |
| 400    | `INVALID_ADDRESS`       | The address in the URL isn't valid                                     |
| 400    | `VALIDATION_FAILED`     | A query or body field is wrong; `details` says which                   |
| 400    | `INVALID_JSON`          | The body isn't valid JSON                                              |
| 404    | `NOT_FOUND`             | No such route                                                          |
| 413    | `PAYLOAD_TOO_LARGE`     | The body is over 32 KB                                                 |
| 429    | `RATE_LIMITED`          | Too many requests; wait `details.retryAfterSec` seconds                |
| 502    | `UPSTREAM_UNAVAILABLE`  | Couldn't reach Hyperliquid                                             |
| 502    | `UPSTREAM_TIMEOUT`      | Hyperliquid took longer than 8 seconds                                 |
| 502    | `UPSTREAM_REJECTED`     | Hyperliquid refused the request; `details.upstreamStatus` has its code |
| 502    | `UPSTREAM_BAD_RESPONSE` | Hyperliquid sent back something we didn't expect                       |
| 503    | `UPSTREAM_RATE_LIMITED` | Hyperliquid is throttling us; wait `details.retryAfterSec` seconds     |
| 500    | `INTERNAL`              | A bug on our side. Look the request ID up in the logs.                 |

Network failures and 5xx errors from Hyperliquid are retried twice before you see an error, so a 502 means it really is down.

## How the numbers are calculated

Most of the metrics are what you'd expect, but a few decisions are worth knowing about:

- **ROI and the equity curve ignore deposits and withdrawals.** A wallet that deposits $1M hasn't made 100%. We chain each period's PnL against the account value before it instead.
- **Win rate skips break-even trades.** Closes with exactly zero PnL still count as closing fills, but not as wins or losses.
- **Fees are converted to USD.** Fees paid in other tokens use the current mark price; wrapped tokens like UBTC are priced off the underlying.
- **Sharpe is annualised over 365 days** from daily returns. You need at least 5 days of data to get one at all.
- **Average hold time is an estimate.** It matches opens to closes first-in, first-out, and can't see opens older than the fills we fetched.
- **Spot trades are left out of trade stats and position history.** Spot trades show up in fills, but only perp closes count toward PnL and win rate.

The full response types, with every field, are in [`backend/src/domain/types.ts`](../backend/src/domain/types.ts).
