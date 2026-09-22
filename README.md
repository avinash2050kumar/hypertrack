# HyperTrack

Track and compare the trading performance of any Hyperliquid wallet.

Paste an address and you get its PnL, equity and drawdown charts, open positions, fills and position history across 24h, 7d, 30d or all time. Save wallets to a watchlist, give them names, and compare a few side by side. Open positions update live over WebSocket.

## Stack

- **Frontend:** React, Vite, MUI, TanStack Query, Recharts, Zustand
- **Backend:** Node, Express 5, `ws`, Zod, Pino

The backend sits between the browser and the Hyperliquid API. It caches responses, keeps within Hyperliquid's rate limits, and shares one upstream WebSocket subscription per wallet across all viewers.

## Getting started

You'll need Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The app runs at http://localhost:5173 and the API at http://localhost:8787. In development Vite proxies `/api` and `/ws` to the backend, so you don't need to set up CORS.

If you'd rather use a deployed backend than run one locally, point `VITE_API_URL` and `VITE_WS_URL` in `.env` at it and run only the frontend:

```bash
pnpm --filter @hypertrack/frontend dev
```

## Scripts

| Command      | What it does                         |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Run backend and frontend together    |
| `pnpm build` | Build both packages                  |
| `pnpm start` | Start the built backend              |
| `pnpm check` | Typecheck, lint and check formatting |

## Configuration

Every setting is listed in `.env.example`, with sensible defaults. The ones you'll usually need to change when deploying:

- `CORS_ORIGIN`: your frontend's URL (comma-separate multiple)
- `TRUST_PROXY`: set to `1` behind a hosting provider's load balancer
- `VITE_API_URL` / `VITE_WS_URL`: where the frontend finds the backend. These are baked in at build time, so redeploy after changing them.

## Deployment

**Backend.** The live WebSocket needs a long-running server, so deploy the included `Dockerfile` to Render, Railway, Fly.io or anything similar. Use `/api/health` as the health check.

The backend can also run on Vercel (`backend/vercel.json`), but only the REST API. Vercel functions can't hold WebSocket connections, so set `VITE_WS_URL=off` there and the UI falls back to polling.

**Frontend.** Deploy `frontend/` to Vercel or any static host. `frontend/vercel.json` already handles client-side routing.

## Project layout

```
backend/    Express API, Hyperliquid client, live relay
frontend/   React app
Dockerfile  Production image for the backend
```
