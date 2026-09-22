import { Box, Stack } from '@mui/material';
import { useState } from 'react';

import { Card, CardHeader, ErrorState } from '../../components/ui';
import {
  PnlValue,
  PositionHistoryTable,
  PositionsTable,
  StatGrid,
  windowLabel,
  type StatItem,
} from '../../components/wallet';
import { formatUsd, type PositionTrip } from '../../domain';
import {
  usePositionHistory,
  useTimeWindow,
  useWalletOverview,
  useWalletPositions,
} from '../../hooks';
import { FillCoverageNote } from './fill-coverage-note';
import { PositionFillsModal } from './position-fills-modal';

export function PositionsTab({ address }: { address: string }) {
  const [window] = useTimeWindow();
  const positions = useWalletPositions(address);
  const overview = useWalletOverview(address, window);
  const history = usePositionHistory(address, window);
  const [selected, setSelected] = useState<PositionTrip | null>(null);
  const trips = history.data?.data.trips ?? [];
  const account = overview.data?.data.account;
  const rows = positions.data?.data ?? [];
  const unrealized = rows.reduce((acc, p) => acc + p.unrealizedPnl, 0);

  const stats: StatItem[] = [
    { id: 'upnl', label: 'Unrealized PnL', value: <PnlValue value={unrealized} /> },
    {
      id: 'notional',
      label: 'Notional',
      value: formatUsd(account?.totalNotional, { compact: 'always' }),
    },
    {
      id: 'margin',
      label: 'Margin used',
      value: formatUsd(account?.marginUsed, { compact: 'always' }),
    },
    {
      id: 'withdrawable',
      label: 'Withdrawable',
      value: formatUsd(account?.withdrawable, { compact: 'always' }),
    },
  ];

  return (
    <Stack sx={{ gap: 2 }}>
      <StatGrid items={stats} loading={positions.isLoading || overview.isLoading} />
      {positions.error ? (
        <ErrorState error={positions.error} onRetry={() => void positions.refetch()} />
      ) : null}
      <Card>
        <CardHeader
          title="Open positions"
          subtitle={`${rows.length} open across all perp markets`}
        />
        <Box sx={{ pt: 1 }}>
          <PositionsTable positions={rows} loading={positions.isLoading} />
        </Box>
      </Card>

      <Card>
        <CardHeader
          title="Position history"
          subtitle={`Every position opened, added to or closed in ${windowLabel(window)}, rebuilt from fills. Click a row for its fills.`}
        />
        <Stack sx={{ gap: 1.5, pt: 1 }}>
          {history.data?.data.fills.truncated ? (
            <Box sx={{ px: { xs: 2, sm: 2.5 } }}>
              <FillCoverageNote coverage={history.data.data.fills} />
            </Box>
          ) : null}
          {history.error && !trips.length ? (
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2 }}>
              <ErrorState error={history.error} onRetry={() => void history.refetch()} />
            </Box>
          ) : (
            <PositionHistoryTable
              trips={trips}
              loading={history.isLoading}
              onSelect={setSelected}
            />
          )}
        </Stack>
      </Card>
      <PositionFillsModal address={address} trip={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
