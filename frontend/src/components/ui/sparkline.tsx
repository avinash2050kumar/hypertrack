import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId } from 'react';

import { SPARKLINE_SIZE } from '../../data';
import { paletteOf } from '../../theme';

interface Point {
  t: number;
  v: number;
}

interface SparklineProps {
  points: readonly Point[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}

function toPath(points: readonly Point[], width: number, height: number): string {
  const values = points.map((point) => point.v);
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const first = points[0]?.t ?? 0;
  const span = (points[points.length - 1]?.t ?? 1) - first || 1;
  return points
    .map((point, i) => {
      const x = ((point.t - first) / span) * width;
      const y = height - 1 - ((point.v - min) / range) * (height - 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function Sparkline({
  points,
  width = SPARKLINE_SIZE.width,
  height = SPARKLINE_SIZE.height,
  color,
  label,
}: SparklineProps) {
  const theme = useTheme();
  const stroke = color ?? paletteOf(theme).primary.main;
  const gradientId = useId();
  const path = points.length > 1 ? toPath(points, width, height) : '';
  if (!path)
    return (
      <Box component="span" aria-hidden="true" sx={{ display: 'inline-block', width, height }} />
    );

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      sx={{ overflow: 'visible', display: 'block', ml: 'auto' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Box>
  );
}
