import { Box, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { Card, CardBody, CardHeader } from '../../components/ui';
import {
  DrawdownChart,
  EquityChart,
  METRICS,
  metricStats,
  PnlBarChart,
  PositionsTable,
  StatGrid,
} from '../../components/wallet';
import { OVERVIEW_METRICS } from '../../data';
import { formatPct, formatUsd, type WalletOverview } from '../../domain';
import { paletteOf } from '../../theme';
import { FillCoverageNote } from './fill-coverage-note';

const EMPTY_TILES = OVERVIEW_METRICS.map((id) => ({ id, label: METRICS[id].label, value: null }));

export function OverviewTab({
  overview,
  loading,
}: {
  overview: WalletOverview | undefined;
  loading: boolean;
}) {
  const accent = paletteOf(useTheme()).primary.main;
  const barsLabel = overview?.window === '24h' ? 'Hourly PnL' : 'Daily PnL';
  return (
    <Stack sx={{ gap: 2 }}>
      <StatGrid
        items={overview ? metricStats(OVERVIEW_METRICS, overview) : EMPTY_TILES}
        loading={loading}
      />
      {overview ? <FillCoverageNote coverage={overview.fills} /> : null}

      <Card>
        <CardHeader title="Account value" subtitle="Spot + perps, as reported by Hyperliquid" />
        <CardBody>
          <EquityChart
            label="Account value over time"
            loading={loading}
            formatValue={(v) => formatUsd(v, { compact: 'always' })}
            series={[
              {
                id: 'accountValue',
                label: 'Account value',
                points: overview?.charts.accountValue ?? [],
                color: accent,
              },
            ]}
          />
        </CardBody>
      </Card>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { lg: '1fr 1fr' } }}>
        <Card>
          <CardHeader title={barsLabel} subtitle="Change in cumulative PnL per bucket" />
          <CardBody>
            <PnlBarChart
              label={barsLabel}
              loading={loading}
              points={overview?.charts.pnlBars ?? []}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Drawdown"
            subtitle={
              overview
                ? `Max ${formatPct(overview.metrics.maxDrawdown.pct)} from peak`
                : 'Distance from running peak'
            }
          />
          <CardBody>
            <DrawdownChart
              label="Underwater equity curve"
              loading={loading}
              points={overview?.charts.drawdown ?? []}
              height={220}
            />
          </CardBody>
        </Card>
      </Box>

      <Card>
        <CardHeader
          title="Open positions"
          subtitle={
            overview
              ? `${overview.positions.length} open · ${formatUsd(overview.account.totalNotional, { compact: 'always' })} notional`
              : undefined
          }
        />
        <Box sx={{ pt: 1 }}>
          <PositionsTable
            positions={overview?.positions ?? []}
            loading={loading}
            variant="compact"
          />
        </Box>
      </Card>
    </Stack>
  );
}
