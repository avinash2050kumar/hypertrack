import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

function fixture(name: string) {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
}

const batch = fixture('batch');
const fills = fixture('fills');
const overview = fixture('overview');
const performance = fixture('performance');
const positionHistory = fixture('position-history');
const positions = fixture('positions');

export const WHALE = '0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4';

export interface ApiLog {
  requests: URL[];
}

function fulfil(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function batchFor(addresses: string[]) {
  const [template] = batch.data.results;
  return {
    ...batch,
    data: {
      ...batch.data,
      results: addresses.map((address) => ({
        ...template,
        address,
        summary: { ...template?.summary, address },
      })),
    },
  };
}

export async function mockApi(page: Page): Promise<ApiLog> {
  const log: ApiLog = { requests: [] };

  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const url = new URL(route.request().url());
      log.requests.push(url);
      const [, , , , resource] = url.pathname.split('/');

      if (url.pathname === '/api/wallets/batch') {
        const body = route.request().postDataJSON();
        return fulfil(route, batchFor(body.addresses));
      }
      switch (resource) {
        case 'overview':
          return fulfil(route, overview);
        case 'performance':
          return fulfil(route, performance);
        case 'positions':
          return fulfil(route, positions);
        case 'position-history':
          return fulfil(route, positionHistory);
        case 'fills':
          return fulfil(
            route,
            url.searchParams.has('before')
              ? { ...fills, data: { ...fills.data, nextBefore: null } }
              : fills,
          );
        default:
          return fulfil(route, { error: { code: 'NOT_FOUND', message: 'No route' } }, 404);
      }
    },
  );

  await page.routeWebSocket(/\/ws\//, () => {});

  return log;
}

export async function mockLiveSocket(page: Page, messages: unknown[]) {
  await page.routeWebSocket(/\/ws\/wallet\//, (socket) => {
    for (const message of messages) socket.send(JSON.stringify(message));
  });
}

export async function seedWatchlist(page: Page, wallets: { address: string; label: string }[]) {
  await page.addInitScript((entries) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(
      'hypertrack:watchlist',
      JSON.stringify({
        version: 1,
        state: { wallets: entries.map((entry, i) => ({ ...entry, addedAt: i })) },
      }),
    );
  }, wallets);
}
