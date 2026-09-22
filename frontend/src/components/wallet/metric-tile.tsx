import { Box, Skeleton, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { paletteOf } from '../../theme';
import { InfoTip } from '../ui';

export interface MetricTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  info?: ReactNode;
  loading?: boolean;
  highlight?: boolean;
  size?: 'md' | 'lg';
}

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

export function MetricTile({
  label,
  value,
  hint,
  info,
  loading,
  highlight,
  size = 'md',
}: MetricTileProps) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        minWidth: 0,
        px: 1.75,
        py: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: highlight ? theme.alpha(paletteOf(theme).primary.main, 0.5) : 'divider',
        bgcolor: highlight ? theme.alpha(paletteOf(theme).primary.main, 0.05) : 'background.paper',
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
        <Typography variant="label" sx={ellipsis}>
          {label}
        </Typography>
        {info ? <InfoTip content={info} /> : null}
      </Box>
      {loading ? (
        <Skeleton
          width={size === 'lg' ? 128 : 80}
          height={size === 'lg' ? 28 : 20}
          sx={{ my: 0.5 }}
        />
      ) : (
        <Typography
          variant="mono"
          component="div"
          sx={{
            ...ellipsis,
            fontWeight: 600,
            color: 'text.primary',
            fontSize: size === 'lg' ? '1.5rem' : '1.125rem',
          }}
        >
          {value}
        </Typography>
      )}
      {hint && !loading ? (
        <Typography variant="body2" component="div" sx={{ ...ellipsis, color: 'text.secondary' }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
