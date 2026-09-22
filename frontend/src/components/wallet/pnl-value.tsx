import { Box } from '@mui/material';
import type { Theme } from '@mui/material/styles';

import { PNL_NEUTRAL_EPSILON } from '../../data';
import { formatPct, formatPnl } from '../../domain';
import { toneColor } from '../../theme';

type PnlTone = 'positive' | 'negative' | 'neutral';
type PnlFormat = 'usd' | 'pct';

export function pnlTone(value: number | null | undefined, format: PnlFormat = 'usd'): PnlTone {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'neutral';
  if (Math.abs(value) < PNL_NEUTRAL_EPSILON[format]) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

// Charts colour by sign too; they call this so the green/red decision lives in one place.
export function pnlColor(
  theme: Theme,
  value: number | null | undefined,
  format: PnlFormat = 'usd',
): string {
  return toneColor(theme, pnlTone(value, format));
}

const arrows: Record<PnlTone, string> = { positive: '▲', negative: '▼', neutral: '' };

interface PnlValueProps {
  value: number | null | undefined;
  format?: PnlFormat;
  compact?: boolean;
  arrow?: boolean;
  size?: 'inherit' | 'lg';
}

export function PnlValue({
  value,
  format = 'usd',
  compact = false,
  arrow = false,
  size = 'inherit',
}: PnlValueProps) {
  const tone = pnlTone(value, format);
  const text =
    format === 'pct'
      ? formatPct(value, { signed: true })
      : formatPnl(value, compact ? 'always' : 'auto');
  return (
    <Box
      component="span"
      sx={(theme) => ({
        ...theme.typography.mono,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        color: toneColor(theme, tone),
        ...(size === 'lg' && { fontSize: '1rem' }),
      })}
    >
      {arrow && arrows[tone] ? (
        <Box component="span" aria-hidden="true" sx={{ fontSize: '0.7em' }}>
          {arrows[tone]}
        </Box>
      ) : null}
      {text}
    </Box>
  );
}
