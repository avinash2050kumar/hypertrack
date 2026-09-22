import { Box, Link, Skeleton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { SPARKLINE_CARD_SIZE } from '../../data';
import { formatUsd, type SeriesPoint } from '../../domain';
import { Card, Num, Sparkline } from '../ui';
import { AddressChip } from './address-chip';
import { PnlValue } from './pnl-value';
import { StatGrid, type StatItem } from './stat-grid';

interface WalletCardProps {
  address: string;
  label?: string;
  accountValue?: number | null;
  pnl?: number | null;
  pnlLabel?: string;
  trend?: readonly SeriesPoint[];
  stats?: readonly StatItem[];
  color?: string;
  loading?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
}

export function WalletCard({
  address,
  label,
  accountValue,
  pnl,
  pnlLabel = 'PnL',
  trend,
  stats,
  color,
  loading,
  actions,
  footer,
}: WalletCardProps) {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            {color ? (
              <Box
                aria-hidden="true"
                sx={{ width: 10, height: 10, flexShrink: 0, borderRadius: '50%', bgcolor: color }}
              />
            ) : null}
            <Link
              component={RouterLink}
              to={`/wallet/${address}`}
              noWrap
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              {label || 'Unlabelled wallet'}
            </Link>
          </Stack>
          <Box sx={{ mt: 0.25 }}>
            <AddressChip address={address} />
          </Box>
        </Box>
        {actions ? (
          <Stack direction="row" sx={{ flexShrink: 0, alignItems: 'center', gap: 0.5 }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>

      <Stack
        direction="row"
        sx={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5 }}
      >
        <Box>
          {loading ? (
            <Skeleton width={128} height={28} />
          ) : (
            <Num size="1.5rem" weight={600} tone="primary">
              {formatUsd(accountValue)}
            </Num>
          )}
          <Stack
            direction="row"
            sx={{ mt: 0.5, alignItems: 'center', gap: 0.75, color: 'text.secondary' }}
          >
            <Typography variant="body2" component="span">
              {pnlLabel}
            </Typography>
            {loading ? <Skeleton width={64} height={14} /> : <PnlValue value={pnl} arrow />}
          </Stack>
        </Box>
        {trend ? (
          <Sparkline
            points={trend}
            color={color}
            width={SPARKLINE_CARD_SIZE.width}
            height={SPARKLINE_CARD_SIZE.height}
          />
        ) : null}
      </Stack>

      {stats?.length ? <StatGrid items={stats} loading={loading} columns={2} /> : null}
      {footer}
    </Card>
  );
}
