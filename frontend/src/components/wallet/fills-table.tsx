import { Stack, Typography } from '@mui/material';

import { formatDateTime, formatPrice, formatSize, formatUsd, type Fill } from '../../domain';
import { EmptyState, Num, SortableTable, type Column } from '../ui';
import { CoinLabel } from './coin-icon';
import { PnlValue } from './pnl-value';
import { SideBadge } from './side-badge';

const COLUMNS: Column<Fill>[] = [
  {
    key: 'coin',
    header: 'Coin',
    render: (f) => <CoinLabel coin={f.coin} />,
    sortValue: (f) => f.coin,
  },
  {
    key: 'side',
    header: 'Side',
    render: (f) => (
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <SideBadge side={f.side} />
        <Typography variant="body2" component="span" sx={{ color: 'text.disabled' }}>
          {f.dir}
        </Typography>
      </Stack>
    ),
    sortValue: (f) => f.dir,
  },
  {
    key: 'price',
    header: 'Price',
    align: 'right',
    render: (f) => <Num>{formatPrice(f.px)}</Num>,
    sortValue: (f) => f.px,
  },
  {
    key: 'size',
    header: 'Size',
    align: 'right',
    render: (f) => <Num>{formatSize(f.sz)}</Num>,
    sortValue: (f) => f.sz,
  },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    render: (f) => <Num>{formatUsd(f.px * f.sz)}</Num>,
    sortValue: (f) => f.px * f.sz,
  },
  {
    key: 'fee',
    header: 'Fee',
    align: 'right',
    render: (f) => (
      <Num tone="secondary">
        {f.fee.toFixed(Math.abs(f.fee) < 1 ? 4 : 2)} <Num tone="disabled">{f.feeToken}</Num>
      </Num>
    ),
    sortValue: (f) => f.fee,
  },
  {
    key: 'pnl',
    header: 'Closed PnL',
    align: 'right',
    render: (f) =>
      f.closedPnl === 0 ? <Num tone="disabled">—</Num> : <PnlValue value={f.closedPnl} />,
    sortValue: (f) => f.closedPnl,
  },
  {
    key: 'time',
    header: 'Time',
    align: 'right',
    render: (f) => <Num tone="secondary">{formatDateTime(f.time)}</Num>,
    sortValue: (f) => f.time,
  },
];

interface FillsTableProps {
  fills: readonly Fill[];
  loading?: boolean;
  label?: string;
}

export function FillsTable({ fills, loading, label = 'Fills' }: FillsTableProps) {
  return (
    <SortableTable
      label={label}
      columns={COLUMNS}
      rows={fills}
      getRowKey={(f) => `${f.tid}-${f.hash}`}
      defaultSort={{ key: 'time', direction: 'desc' }}
      loading={loading}
      skeletonRows={8}
      empty={
        <EmptyState
          title="No fills yet"
          description="Trades will show up here as soon as this wallet executes."
        />
      }
    />
  );
}
