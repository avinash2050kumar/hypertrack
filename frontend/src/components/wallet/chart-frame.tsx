import { Box, Skeleton, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { CHART_INTRADAY_SPAN_MS, DAY_MS } from '../../data';
import { formatDate, formatDateTime } from '../../domain';
import { paletteOf } from '../../theme';
import { Num } from '../ui';

export interface Point {
  t: number;
  v: number;
}

interface ChartFrameProps {
  height: number;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  label: string;
  children: ReactNode;
}

export function useChartStyles() {
  const theme = useTheme();
  const palette = paletteOf(theme);
  return {
    theme,
    axisTick: {
      fill: palette.text.disabled,
      fontSize: 11,
      fontFamily: theme.typography.mono.fontFamily,
    },
    grid: palette.divider,
    cursor: palette.text.disabled,
    cursorFill: palette.raised,
    accent: palette.primary.main,
    negative: palette.error.main,
  };
}

export function ChartFrame({
  height,
  loading,
  empty,
  emptyText = 'No data for this window yet.',
  label,
  children,
}: ChartFrameProps) {
  if (loading) return <Skeleton height={height} sx={{ borderRadius: 2 }} />;
  if (empty) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          fontSize: '0.75rem',
          color: 'text.disabled',
        }}
      >
        {emptyText}
      </Box>
    );
  }
  return (
    <Box component="figure" aria-label={label} sx={{ height, width: '100%', m: 0 }}>
      {children}
    </Box>
  );
}

export function timeTickFormatter(spanMs: number): (t: number) => string {
  return spanMs <= CHART_INTRADAY_SPAN_MS
    ? (t) => formatDateTime(t).split(', ')[1] ?? ''
    : formatDate;
}

interface TooltipRow {
  label: string;
  value: ReactNode;
  color?: string;
}

export function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <Box
      sx={(theme) => ({
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'raised',
        fontSize: '0.75rem',
        boxShadow: theme.shadows[8],
      })}
    >
      <Box sx={{ mb: 0.5, color: 'text.disabled' }}>{title}</Box>
      {rows.map((row) => (
        <Stack
          key={row.label}
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
            {row.color ? (
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color }} />
            ) : null}
            {row.label}
          </Stack>
          <Num tone="primary">{row.value}</Num>
        </Stack>
      ))}
    </Box>
  );
}

// Day-aligned ticks keep multi-day axes from repeating the same date label.
export function timeTicks(points: readonly Point[]): number[] | undefined {
  const first = points[0]?.t;
  const last = points[points.length - 1]?.t;
  if (first === undefined || last === undefined || last - first <= CHART_INTRADAY_SPAN_MS)
    return undefined;
  const start = new Date(first);
  start.setHours(24, 0, 0, 0);
  const ticks: number[] = [];
  for (let t = start.getTime(); t <= last; t += DAY_MS) ticks.push(t);
  return ticks;
}

export function seriesSpan(points: readonly Point[]): number {
  const first = points[0]?.t ?? 0;
  const last = points[points.length - 1]?.t ?? 0;
  return last - first;
}
