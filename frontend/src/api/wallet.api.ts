import type {
  BatchResponse,
  FillsPage,
  Position,
  PositionHistory,
  TimeWindow,
  WalletOverview,
  WalletPerformance,
} from '../domain';
import { request } from './client';

export const walletKeys = {
  overview: (address: string, window: TimeWindow) =>
    ['wallet', address, 'overview', window] as const,
  overviews: (address: string) => ['wallet', address, 'overview'] as const,
  performance: (address: string, window: TimeWindow) =>
    ['wallet', address, 'performance', window] as const,
  positions: (address: string) => ['wallet', address, 'positions'] as const,
  fills: (address: string, limit: number) => ['wallet', address, 'fills', limit] as const,
  positionHistory: (address: string, window: TimeWindow) =>
    ['wallet', address, 'position-history', window] as const,
  tripFills: (address: string, tripId: string) =>
    ['wallet', address, 'trip-fills', tripId] as const,
  batch: (addresses: readonly string[], window: TimeWindow) =>
    ['batch', window, ...addresses] as const,
};

const base = (address: string) => `/api/wallets/${address}`;

export interface FillsParams {
  limit: number;
  before?: number;
  after?: number;
  coin?: string;
}

function fillsQuery({ limit, before, after, coin }: FillsParams): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', String(before));
  if (after !== undefined) params.set('after', String(after));
  if (coin) params.set('coin', coin);
  return params.toString();
}

export const walletApi = {
  overview: (address: string, window: TimeWindow) =>
    request<WalletOverview>(`${base(address)}/overview?window=${window}`),
  performance: (address: string, window: TimeWindow) =>
    request<WalletPerformance>(`${base(address)}/performance?window=${window}`),
  positions: (address: string) => request<Position[]>(`${base(address)}/positions`),
  fills: (address: string, params: FillsParams) =>
    request<FillsPage>(`${base(address)}/fills?${fillsQuery(params)}`),
  positionHistory: (address: string, window: TimeWindow) =>
    request<PositionHistory>(`${base(address)}/position-history?window=${window}`),
  batch: (addresses: readonly string[], window: TimeWindow) =>
    request<BatchResponse>('/api/wallets/batch', {
      method: 'POST',
      body: JSON.stringify({ addresses, window }),
    }),
};
