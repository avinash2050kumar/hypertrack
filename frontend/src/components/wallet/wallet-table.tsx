import { CloseRounded } from '@mui/icons-material';
import { Box, IconButton, Skeleton, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMemo, type ReactNode } from 'react';

import {
  formatPct,
  formatUsd,
  shortAddress,
  type BatchItem,
  type WalletSummary,
} from '../../domain';
import type { WatchedWallet } from '../../store';
import { visuallyHidden } from '../../theme';
import { Badge, EditableText, Num, SortableTable, Sparkline, Tooltip, type Column } from '../ui';
import { AddressChip } from './address-chip';
import { pnlColor, PnlValue } from './pnl-value';

export interface WatchlistRow {
  wallet: WatchedWallet;
  result?: BatchItem;
}

interface WalletTableProps {
  rows: readonly WatchlistRow[];
  onOpen: (address: string) => void;
  onPrefetch?: (address: string) => void;
  onRename: (address: string, label: string) => void;
  onRemove: (address: string) => void;
}

function summaryOf(row: WatchlistRow): WalletSummary | null {
  return row.result?.ok ? row.result.summary : null;
}

function cell(row: WatchlistRow, render: (summary: WalletSummary) => ReactNode): ReactNode {
  const summary = summaryOf(row);
  if (summary) return render(summary);
  if (row.result && !row.result.ok) return <Num tone="disabled">—</Num>;
  return <Skeleton width={56} height={16} sx={{ ml: 'auto' }} />;
}

function metric(
  key: string,
  header: string,
  pick: (s: WalletSummary) => number | null,
  render: (value: number | null) => ReactNode,
): Column<WatchlistRow> {
  return {
    key,
    header,
    align: 'right',
    render: (row) => cell(row, (s) => render(pick(s))),
    sortValue: (row) => {
      const summary = summaryOf(row);
      return summary ? pick(summary) : null;
    },
  };
}

export function WalletTable({ rows, onOpen, onPrefetch, onRename, onRemove }: WalletTableProps) {
  const theme = useTheme();
  // useMemo: stable columns keep SortableTable's accessors, and therefore its sort, from recomputing.
  const columns = useMemo<Column<WatchlistRow>[]>(
    () => [
      {
        key: 'label',
        header: 'Wallet',
        render: ({ wallet, result }) => (
          <Stack sx={{ minWidth: 0, maxWidth: 240, alignItems: 'flex-start' }}>
            <EditableText
              value={wallet.label}
              placeholder="Add label"
              label="Wallet label"
              onSave={(label) => onRename(wallet.address, label)}
            />
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <AddressChip address={wallet.address} />
              {result && !result.ok ? (
                <Tooltip content={result.error.message}>
                  <Badge tone="negative">error</Badge>
                </Tooltip>
              ) : null}
            </Stack>
          </Stack>
        ),
        sortValue: ({ wallet }) => wallet.label || wallet.address,
      },
      metric(
        'accountValue',
        'Account value',
        (s) => s.accountValue,
        (v) => <Num tone="primary">{formatUsd(v)}</Num>,
      ),
      metric(
        'pnl24h',
        '24h PnL',
        (s) => s.pnl24h,
        (v) => <PnlValue value={v} />,
      ),
      metric(
        'pnl7d',
        '7d PnL',
        (s) => s.pnl7d,
        (v) => <PnlValue value={v} />,
      ),
      metric(
        'roi',
        'ROI 7d',
        (s) => s.roi,
        (v) => <PnlValue value={v} format="pct" />,
      ),
      metric(
        'winRate',
        'Win rate',
        (s) => s.winRate,
        (v) => <Num>{formatPct(v, { decimals: 1 })}</Num>,
      ),
      metric(
        'maxDrawdown',
        'Max DD',
        (s) => s.maxDrawdownPct,
        (v) => <Num tone="secondary">{formatPct(v, { decimals: 1 })}</Num>,
      ),
      metric(
        'openPositions',
        'Positions',
        (s) => s.openPositions,
        (v) => <Num>{v ?? '—'}</Num>,
      ),
      {
        key: 'trend',
        header: '7d',
        align: 'right',
        hideInCard: true,
        render: (row) =>
          cell(row, (s) => (
            <Sparkline
              points={s.sparkline}
              color={pnlColor(theme, s.pnl7d)}
              label="7 day flow-adjusted equity trend"
            />
          )),
      },
      {
        key: 'actions',
        header: (
          <Box component="span" sx={visuallyHidden}>
            Actions
          </Box>
        ),
        align: 'right',
        render: ({ wallet }) => (
          <IconButton
            color="error"
            aria-label={`Remove ${wallet.label || shortAddress(wallet.address)} from watchlist`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(wallet.address);
            }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [onRename, onRemove, theme],
  );

  return (
    <SortableTable
      label="Tracked wallets"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.wallet.address}
      defaultSort={{ key: 'pnl7d', direction: 'desc' }}
      onRowClick={(row) => onOpen(row.wallet.address)}
      onRowIntent={onPrefetch ? (row) => onPrefetch(row.wallet.address) : undefined}
      rowLabel={(row) => `Open ${row.wallet.label || shortAddress(row.wallet.address)}`}
    />
  );
}
