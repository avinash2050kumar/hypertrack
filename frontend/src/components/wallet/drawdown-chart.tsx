import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatDateTime, formatPct } from '../../domain';
import {
  ChartFrame,
  ChartTooltip,
  seriesSpan,
  timeTickFormatter,
  timeTicks,
  useChartStyles,
  type Point,
} from './chart-frame';

interface DrawdownChartProps {
  points: readonly Point[];
  label: string;
  height?: number;
  loading?: boolean;
}

export function DrawdownChart({ points, label, height = 180, loading }: DrawdownChartProps) {
  const chart = useChartStyles();
  const gradientId = useId();
  const color = chart.negative;
  return (
    <ChartFrame height={height} loading={loading} empty={points.length < 2} label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...points]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.05} />
              <stop offset="100%" stopColor={color} stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tick={chart.axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={timeTickFormatter(seriesSpan(points))}
            ticks={timeTicks(points)}
            minTickGap={40}
          />
          <YAxis
            tick={chart.axisTick}
            tickLine={false}
            axisLine={false}
            width={64}
            domain={['dataMin', 0]}
            tickFormatter={(v: number) => formatPct(v, { decimals: 0 })}
          />
          <Tooltip
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload;
              if (!active || !point || typeof point.t !== 'number' || typeof point.v !== 'number')
                return null;
              return (
                <ChartTooltip
                  title={formatDateTime(point.t)}
                  rows={[{ label: 'From peak', value: formatPct(point.v), color }]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            baseValue={0}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
