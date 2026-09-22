import { Box, Stack, Typography } from '@mui/material';
import { useState } from 'react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Modal,
  Num,
  SortableTable,
  type Column,
} from '../../components/ui';
import {
  CoinLabel,
  FillsTable,
  METRICS,
  metricStats,
  PnlBarChart,
  PnlValue,
  StatGrid,
  type StatItem,
} from '../../components/wallet';
import { ATTRIBUTION_CHART_COINS, PERFORMANCE_METRICS } from '../../data';
import {
  formatPct,
  formatUsd,
  type CoinAttribution,
  type SideBreakdown,
  type TimeWindow,
} from '../../domain';
import { useWalletOverview, useWalletPerformance } from '../../hooks';
import { FillCoverageNote } from './fill-coverage-note';

const EMPTY_TILES = PERFORMANCE_METRICS.map((id) => ({
  id,
  label: METRICS[id].label,
  value: null,
}));

const COIN_COLUMNS: Column<CoinAttribution>[] = [
  {
    key: 'coin',
    header: 'Coin',
    render: (c) => <CoinLabel coin={c.coin} />,
    sortValue: (c) => c.coin,
  },
  {
    key: 'net',
    header: 'Net PnL',
    align: 'right',
    render: (c) => <PnlValue value={c.netPnl} />,
    sortValue: (c) => c.netPnl,
  },
  {
    key: 'realized',
    header: 'Realized',
    align: 'right',
    render: (c) => <PnlValue value={c.realizedPnl} />,
    sortValue: (c) => c.realizedPnl,
  },
  {
    key: 'fees',
    header: 'Fees',
    align: 'right',
    render: (c) => <Num tone="secondary">{formatUsd(c.fees)}</Num>,
    sortValue: (c) => c.fees,
  },
  {
    key: 'volume',
    header: 'Volume',
    align: 'right',
    render: (c) => <Num>{formatUsd(c.volume, { compact: 'always' })}</Num>,
    sortValue: (c) => c.volume,
  },
  {
    key: 'fills',
    header: 'Closes',
    align: 'right',
    render: (c) => <Num>{c.closingFills}</Num>,
    sortValue: (c) => c.closingFills,
  },
  {
    key: 'winRate',
    header: 'Win rate',
    align: 'right',
    render: (c) => <Num>{formatPct(c.winRate, { decimals: 1 })}</Num>,
    sortValue: (c) => c.winRate,
  },
];

function FormulasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="How these numbers are calculated">
      <Stack component="dl" sx={{ m: 0, gap: 1.5, maxHeight: '60vh', overflowY: 'auto', pr: 0.5 }}>
        {PERFORMANCE_METRICS.map((id) => (
          <Box key={id}>
            <Typography component="dt" sx={{ fontWeight: 500 }}>
              {METRICS[id].label}
            </Typography>
            <Typography component="dd" sx={{ m: 0, color: 'text.secondary' }}>
              {METRICS[id].info}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Modal>
  );
}

function sideStats(side: SideBreakdown): StatItem[] {
  return [
    { id: 'pnl', label: 'Realized', value: <PnlValue value={side.realizedPnl} /> },
    { id: 'winRate', label: 'Win rate', value: formatPct(side.winRate, { decimals: 1 }) },
    { id: 'closes', label: 'Closing fills', value: side.closingFills },
    { id: 'volume', label: 'Volume', value: formatUsd(side.volume, { compact: 'always' }) },
  ];
}

export function PerformanceTab({ address, window }: { address: string; window: TimeWindow }) {
  const query = useWalletPerformance(address, window);
  const overview = useWalletOverview(address, window);
  const [showFormulas, setShowFormulas] = useState(false);
  const performance = query.data?.data;
  const loading = query.isLoading;

  if (query.error && !performance)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const topCoins = [...(performance?.byCoin ?? [])]
    .sort((a, b) => Math.abs(b.netPnl) - Math.abs(a.netPnl))
    .slice(0, ATTRIBUTION_CHART_COINS);
  const account = overview.data?.data.account;

  return (
    <Stack sx={{ gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm" variant="ghost" onClick={() => setShowFormulas(true)}>
          How we calculate these
        </Button>
        <FormulasModal open={showFormulas} onClose={() => setShowFormulas(false)} />
      </Box>
      <StatGrid
        items={
          performance
            ? metricStats(PERFORMANCE_METRICS, { metrics: performance.metrics, account })
            : EMPTY_TILES
        }
        loading={loading}
      />
      {performance ? <FillCoverageNote coverage={performance.fills} /> : null}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { lg: '3fr 2fr' } }}>
        <Card>
          <CardHeader
            title="PnL by coin"
            subtitle={`Net realized PnL, top ${ATTRIBUTION_CHART_COINS} by magnitude`}
          />
          <CardBody>
            <PnlBarChart
              label="Net PnL attribution by coin"
              layout="horizontal"
              loading={loading}
              height={Math.max(200, topCoins.length * 26)}
              points={topCoins.map((coin, i) => ({ t: i, v: coin.netPnl }))}
              formatX={(i) => topCoins[i]?.coin ?? ''}
            />
          </CardBody>
        </Card>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {(['long', 'short'] as const).map((side) => (
            <Card key={side}>
              <CardHeader title={side === 'long' ? 'Long side' : 'Short side'} />
              <CardBody>
                <StatGrid
                  items={
                    performance
                      ? sideStats(performance[side])
                      : sideStats({ realizedPnl: 0, winRate: null, closingFills: 0, volume: 0 })
                  }
                  loading={loading}
                  columns={2}
                />
              </CardBody>
            </Card>
          ))}
        </Box>
      </Box>

      <Card>
        <CardHeader title="Per-coin breakdown" />
        <Box sx={{ pt: 1 }}>
          <SortableTable
            label="Per-coin breakdown"
            columns={COIN_COLUMNS}
            rows={performance?.byCoin ?? []}
            getRowKey={(c) => c.coin}
            defaultSort={{ key: 'net', direction: 'desc' }}
            loading={loading}
            empty={<EmptyState title="No perp trades in this window" />}
          />
        </Box>
      </Card>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xl: '1fr 1fr' } }}>
        <Card>
          <CardHeader title="Best trades" subtitle="Largest winning closing fills" />
          <Box sx={{ pt: 1 }}>
            <FillsTable
              label="Best trades"
              fills={performance?.bestTrades ?? []}
              loading={loading}
            />
          </Box>
        </Card>
        <Card>
          <CardHeader title="Worst trades" subtitle="Largest losing closing fills" />
          <Box sx={{ pt: 1 }}>
            <FillsTable
              label="Worst trades"
              fills={performance?.worstTrades ?? []}
              loading={loading}
            />
          </Box>
        </Card>
      </Box>
    </Stack>
  );
}
