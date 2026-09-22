import { TrackChangesRounded } from '@mui/icons-material';
import { Box, Stack } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  Toggle,
  useToast,
} from '../../components/ui';
import {
  AddressInput,
  PnlValue,
  StatGrid,
  WalletTable,
  type StatItem,
  type WatchlistRow,
} from '../../components/wallet';
import { formatRelativeTime, formatUsd, shortAddress, type WalletSummary } from '../../domain';
import { usePrefetchWallet, useWalletBatch, useWatchlist } from '../../hooks';
import { loadWalletPage } from '../loaders';
import { ExampleWallets } from './example-wallets';

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function sumOf(
  summaries: readonly WalletSummary[],
  pick: (s: WalletSummary) => number,
): number | null {
  return summaries.length ? summaries.reduce((acc, s) => acc + pick(s), 0) : null;
}

function summaryStats(
  summaries: readonly WalletSummary[],
  labelFor: (address: string) => string,
): StatItem[] {
  const best = summaries.reduce<WalletSummary | null>(
    (acc, s) => (!acc || s.pnl7d > acc.pnl7d ? s : acc),
    null,
  );
  return [
    {
      id: 'total',
      label: 'Tracked value',
      value: formatUsd(sumOf(summaries, (s) => s.accountValue)),
      hint: `${summaries.length} wallets`,
    },
    {
      id: 'pnl24h',
      label: '24h PnL',
      value: <PnlValue value={sumOf(summaries, (s) => s.pnl24h)} />,
      hint: 'Sum across watchlist',
    },
    {
      id: 'pnl7d',
      label: '7d PnL',
      value: <PnlValue value={sumOf(summaries, (s) => s.pnl7d)} />,
      hint: 'Sum across watchlist',
    },
    {
      id: 'best',
      label: 'Top 7d performer',
      value: best ? <PnlValue value={best.pnl7d} /> : '—',
      hint: best ? labelFor(best.address) : 'No data yet',
    },
  ];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const prefetchOverview = usePrefetchWallet();
  const prefetchWallet = (address: string) => {
    void loadWalletPage();
    prefetchOverview(address);
  };
  const toast = useToast();
  const { wallets, add, remove, restore, rename } = useWatchlist();
  const addresses = wallets.map((wallet) => wallet.address);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const batch = useWalletBatch(addresses, '7d', autoRefresh);
  const now = useNow(5_000);
  const lastUpdated = batch.updatedAt;

  const labelFor = (address: string) =>
    wallets.find((wallet) => wallet.address === address)?.label || shortAddress(address);

  // useMemo: rows feed the table's sort memo; recomputing only when data changes keeps sorting idle.
  const rows = useMemo<WatchlistRow[]>(
    () => wallets.map((wallet) => ({ wallet, result: batch.byAddress.get(wallet.address) })),
    [wallets, batch.byAddress],
  );

  const summaries = rows.flatMap((row) => (row.result?.ok ? [row.result.summary] : []));

  // useCallback: a dependency of WalletTable's columns memo, which drives the sort memo.
  const handleRemove = useCallback(
    (address: string) => {
      const removed = remove(address);
      if (!removed) return;
      toast(`Removed ${removed.wallet.label || shortAddress(address)}`, {
        label: 'Undo',
        onClick: () => restore(removed.wallet, removed.index),
      });
    },
    [remove, restore, toast],
  );

  const compareHref = `/compare?addresses=${addresses.slice(0, 4).join(',')}`;

  return (
    <Stack sx={{ gap: 3 }}>
      <PageHeader
        title="Watchlist"
        subtitle="Track any Hyperliquid wallet. Your list stays in this browser."
        aside={
          <Box sx={{ width: { xs: '100%', md: 480 } }}>
            <AddressInput onSubmit={(address) => add(address)} />
          </Box>
        }
      />

      {wallets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TrackChangesRounded />}
            title="Your watchlist is empty"
            description="Paste any Hyperliquid address above to see its PnL, win rate, drawdown and open positions — refreshed every 15 seconds. Or start with one of these:"
            action={<ExampleWallets onPick={(address, label) => add(address, label)} />}
          />
        </Card>
      ) : (
        <>
          <StatGrid
            items={summaryStats(summaries, labelFor)}
            loading={batch.isLoading && summaries.length === 0}
          />
          {batch.error && summaries.length === 0 ? (
            <ErrorState error={batch.error} onRetry={() => void batch.refetch()} />
          ) : null}
          <Card>
            <CardHeader
              title="Tracked wallets"
              subtitle={
                <span aria-live="polite">
                  {batch.isFetching
                    ? 'Refreshing…'
                    : lastUpdated
                      ? `Updated ${formatRelativeTime(lastUpdated, now)}`
                      : 'Loading…'}{' '}
                  {autoRefresh ? '· every 15s' : '· paused'}
                </span>
              }
              actions={
                <>
                  <Stack
                    direction="row"
                    component="span"
                    sx={{
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  >
                    <Toggle checked={autoRefresh} onChange={setAutoRefresh} label="Auto-refresh" />
                    Auto-refresh
                  </Stack>
                  {wallets.length > 1 ? (
                    <LinkButton to={compareHref}>
                      Compare top {Math.min(4, wallets.length)}
                    </LinkButton>
                  ) : null}
                </>
              }
            />
            <Box sx={{ pt: 1.5 }}>
              <WalletTable
                rows={rows}
                onOpen={(address) => navigate(`/wallet/${address}`)}
                onPrefetch={prefetchWallet}
                onRename={rename}
                onRemove={handleRemove}
              />
            </Box>
          </Card>
        </>
      )}
    </Stack>
  );
}
