import {
  formatDateTime,
  formatDuration,
  formatPrice,
  formatSize,
  type PositionTrip,
} from '../../domain';
import { Badge, EmptyState, Num, SortableTable, Tooltip, type Column } from '../ui';
import { CoinLabel } from './coin-icon';
import { PnlValue } from './pnl-value';
import { SideBadge } from './side-badge';

function duration(trip: PositionTrip): number {
  return (trip.closedAt ?? Date.now()) - trip.openedAt;
}

const COLUMNS: Column<PositionTrip>[] = [
  {
    key: 'coin',
    header: 'Coin',
    render: (t) => <CoinLabel coin={t.coin} />,
    sortValue: (t) => t.coin,
  },
  {
    key: 'side',
    header: 'Side',
    render: (t) => <SideBadge side={t.side} />,
    sortValue: (t) => t.side,
  },
  {
    key: 'opened',
    header: 'Opened',
    align: 'right',
    render: (t) =>
      t.openedBeforeData ? (
        <Tooltip content="Opened before the fills we have for this window; entry covers only the adds we can see.">
          <Num tone="secondary">before {formatDateTime(t.openedAt)}</Num>
        </Tooltip>
      ) : (
        <Num tone="secondary">{formatDateTime(t.openedAt)}</Num>
      ),
    sortValue: (t) => t.openedAt,
  },
  {
    key: 'closed',
    header: 'Closed',
    align: 'right',
    render: (t) =>
      t.closedAt ? (
        <Num tone="secondary">{formatDateTime(t.closedAt)}</Num>
      ) : (
        <Badge tone="accent">Open</Badge>
      ),
    sortValue: (t) => t.closedAt ?? Number.MAX_SAFE_INTEGER,
  },
  {
    key: 'duration',
    header: 'Held',
    align: 'right',
    render: (t) => <Num>{formatDuration(duration(t))}</Num>,
    sortValue: duration,
  },
  {
    key: 'size',
    header: 'Max size',
    align: 'right',
    render: (t) => <Num>{formatSize(t.maxSize)}</Num>,
    sortValue: (t) => t.maxSize,
  },
  {
    key: 'entry',
    header: 'Avg entry',
    align: 'right',
    render: (t) => <Num>{formatPrice(t.entryPx)}</Num>,
    sortValue: (t) => t.entryPx,
  },
  {
    key: 'exit',
    header: 'Avg exit',
    align: 'right',
    render: (t) => <Num>{formatPrice(t.exitPx)}</Num>,
    sortValue: (t) => t.exitPx,
  },
  {
    key: 'realized',
    header: 'Realized',
    align: 'right',
    render: (t) => <PnlValue value={t.realizedPnl} />,
    sortValue: (t) => t.realizedPnl,
  },
  {
    key: 'net',
    header: 'Net',
    align: 'right',
    render: (t) => <PnlValue value={t.netPnl} />,
    sortValue: (t) => t.netPnl,
  },
  {
    key: 'fills',
    header: 'Fills',
    align: 'right',
    render: (t) => <Num>{t.fillCount}</Num>,
    sortValue: (t) => t.fillCount,
  },
];

interface PositionHistoryTableProps {
  trips: readonly PositionTrip[];
  loading?: boolean;
  onSelect: (trip: PositionTrip) => void;
}

export function PositionHistoryTable({ trips, loading, onSelect }: PositionHistoryTableProps) {
  return (
    <SortableTable
      label="Position history"
      columns={COLUMNS}
      rows={trips}
      getRowKey={(t) => t.id}
      defaultSort={{ key: 'opened', direction: 'desc' }}
      onRowClick={onSelect}
      rowLabel={(t) => `Show fills for ${t.side} ${t.coin} opened ${formatDateTime(t.openedAt)}`}
      loading={loading}
      empty={
        <EmptyState
          title="No positions in this window"
          description="Pick a longer window to see older positions."
        />
      }
    />
  );
}
