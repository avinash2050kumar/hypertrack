import { formatPrice, formatSize, formatUsd, type Position } from '../../domain';
import { EmptyState, Num, SortableTable, type Column } from '../ui';
import { CoinLabel } from './coin-icon';
import { LeverageBadge } from './leverage-badge';
import { PnlValue } from './pnl-value';
import { SideBadge } from './side-badge';

interface PositionsTableProps {
  positions: readonly Position[];
  loading?: boolean;
  variant?: 'full' | 'compact';
}

const coin: Column<Position> = {
  key: 'coin',
  header: 'Coin',
  render: (p) => <CoinLabel coin={p.coin} />,
  sortValue: (p) => p.coin,
};
const side: Column<Position> = {
  key: 'side',
  header: 'Side',
  render: (p) => <SideBadge side={p.side} />,
  sortValue: (p) => p.side,
};
const size: Column<Position> = {
  key: 'size',
  header: 'Size',
  align: 'right',
  render: (p) => <Num>{formatSize(p.size)}</Num>,
  sortValue: (p) => p.size,
};
const value: Column<Position> = {
  key: 'value',
  header: 'Value',
  align: 'right',
  render: (p) => <Num>{formatUsd(p.positionValue)}</Num>,
  sortValue: (p) => p.positionValue,
};
const entry: Column<Position> = {
  key: 'entry',
  header: 'Entry',
  align: 'right',
  render: (p) => <Num tone="secondary">{formatPrice(p.entryPx)}</Num>,
  sortValue: (p) => p.entryPx,
};
const mark: Column<Position> = {
  key: 'mark',
  header: 'Mark',
  align: 'right',
  render: (p) => <Num>{formatPrice(p.markPx)}</Num>,
  sortValue: (p) => p.markPx,
};
const liq: Column<Position> = {
  key: 'liq',
  header: 'Liq. price',
  align: 'right',
  render: (p) => <Num tone="warning">{formatPrice(p.liquidationPx)}</Num>,
  sortValue: (p) => p.liquidationPx,
};
const upnl: Column<Position> = {
  key: 'upnl',
  header: 'uPnL',
  align: 'right',
  render: (p) => <PnlValue value={p.unrealizedPnl} />,
  sortValue: (p) => p.unrealizedPnl,
};
const roe: Column<Position> = {
  key: 'roe',
  header: 'ROE',
  align: 'right',
  render: (p) => <PnlValue value={p.returnOnEquity} format="pct" />,
  sortValue: (p) => p.returnOnEquity,
};
const leverage: Column<Position> = {
  key: 'leverage',
  header: 'Leverage',
  align: 'right',
  render: (p) => <LeverageBadge leverage={p.leverage} type={p.leverageType} />,
  sortValue: (p) => p.leverage,
};
const margin: Column<Position> = {
  key: 'margin',
  header: 'Margin',
  align: 'right',
  render: (p) => <Num tone="secondary">{formatUsd(p.marginUsed)}</Num>,
  sortValue: (p) => p.marginUsed,
};

const COLUMNS = {
  full: [coin, side, size, value, entry, mark, liq, upnl, roe, leverage, margin],
  compact: [coin, side, value, entry, mark, upnl, roe, leverage],
};

export function PositionsTable({ positions, loading, variant = 'full' }: PositionsTableProps) {
  const columns = COLUMNS[variant];
  return (
    <SortableTable
      label="Open positions"
      columns={columns}
      rows={positions}
      getRowKey={(p) => p.coin}
      defaultSort={{ key: 'value', direction: 'desc' }}
      loading={loading}
      empty={<EmptyState title="No open positions" description="This wallet is flat right now." />}
    />
  );
}
