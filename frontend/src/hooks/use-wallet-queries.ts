import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { walletApi, walletKeys } from '../api';
import {
  DASHBOARD_REFRESH_MS,
  DEFAULT_WINDOW,
  DETAIL_PREFETCH_STALE_MS,
  DETAIL_REFRESH_MS,
  FILLS_PAGE_SIZE,
  MAX_BATCH_ADDRESSES,
  TRIP_FILLS_LIMIT,
} from '../data';
import type { ApiResponse, BatchItem, BatchResponse, PositionTrip, TimeWindow } from '../domain';

export function useWalletOverview(address: string, window: TimeWindow) {
  return useQuery({
    queryKey: walletKeys.overview(address, window),
    queryFn: () => walletApi.overview(address, window),
    placeholderData: keepPreviousData,
    refetchInterval: DETAIL_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

export function useWalletPerformance(address: string, window: TimeWindow) {
  return useQuery({
    queryKey: walletKeys.performance(address, window),
    queryFn: () => walletApi.performance(address, window),
    placeholderData: keepPreviousData,
  });
}

export function useWalletPositions(address: string) {
  return useQuery({
    queryKey: walletKeys.positions(address),
    queryFn: () => walletApi.positions(address),
    refetchInterval: DETAIL_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

export function useWalletFills(address: string) {
  return useInfiniteQuery({
    queryKey: walletKeys.fills(address, FILLS_PAGE_SIZE),
    queryFn: ({ pageParam }) =>
      walletApi.fills(address, { limit: FILLS_PAGE_SIZE, before: pageParam || undefined }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.data.nextBefore ?? undefined,
  });
}

export function usePositionHistory(address: string, window: TimeWindow) {
  return useQuery({
    queryKey: walletKeys.positionHistory(address, window),
    queryFn: () => walletApi.positionHistory(address, window),
    placeholderData: keepPreviousData,
    refetchInterval: DETAIL_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

// Fills that belong to one position lifecycle; an open position reads up to now.
export function useTripFills(address: string, trip: PositionTrip | null) {
  return useQuery({
    queryKey: walletKeys.tripFills(address, trip?.id ?? ''),
    queryFn: () =>
      walletApi.fills(address, {
        limit: TRIP_FILLS_LIMIT,
        coin: trip?.coin,
        after: trip?.openedAt,
        before:
          trip?.closedAt === null || trip?.closedAt === undefined ? undefined : trip.closedAt + 1,
      }),
    enabled: trip !== null,
  });
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

type BatchQueryResult = UseQueryResult<ApiResponse<BatchResponse>, Error>;

// Module-level so TanStack only re-runs it when a query result actually changes; the returned
// object (and its Map) stays referentially stable between renders otherwise.
function combineBatches(results: BatchQueryResult[]) {
  const byAddress = new Map<string, BatchItem>();
  for (const result of results) {
    for (const item of result.data?.data.results ?? []) byAddress.set(item.address, item);
  }
  const updatedAt = Math.max(0, ...results.map((result) => result.dataUpdatedAt));
  return {
    byAddress,
    updatedAt: updatedAt || null,
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    error: results.find((result) => result.error)?.error ?? null,
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

export function useWalletBatch(
  addresses: readonly string[],
  window: TimeWindow,
  autoRefresh = true,
) {
  return useQueries({
    queries: chunk(addresses, MAX_BATCH_ADDRESSES).map((group) => ({
      queryKey: walletKeys.batch(group, window),
      queryFn: () => walletApi.batch(group, window),
      placeholderData: keepPreviousData,
      refetchInterval: autoRefresh ? DASHBOARD_REFRESH_MS : false,
      refetchIntervalInBackground: false,
    })),
    combine: combineBatches,
  });
}

// Warms the detail page's first query so opening a wallet renders from cache.
export function usePrefetchWallet() {
  const client = useQueryClient();
  // useCallback: returned from a custom hook, so callers can safely use it as a dependency.
  return useCallback(
    (address: string) => {
      void client.prefetchQuery({
        queryKey: walletKeys.overview(address, DEFAULT_WINDOW),
        queryFn: () => walletApi.overview(address, DEFAULT_WINDOW),
        staleTime: DETAIL_PREFETCH_STALE_MS,
      });
    },
    [client],
  );
}
