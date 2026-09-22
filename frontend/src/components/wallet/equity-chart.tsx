import { useId } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatDateTime } from '../../domain';
import {
  ChartFrame,
  ChartTooltip,
  seriesSpan,
  timeTickFormatter,
  timeTicks,
  useChartStyles,
  type Point,
} from './chart-frame';

export interface ChartSeries {
  id: string;
  label: string;
  points: readonly Point[];
  color: string;
}

interface EquityChartProps {
  series: readonly ChartSeries[];
  formatValue: (value: number) => string;
  label: string;
  height?: number;
  loading?: boolean;
  baseline?: number;
}

type Row = { t: number } & Record<string, number>;

function mergeSeries(series: readonly ChartSeries[]): Row[] {
  const rows = new Map<number, Row>();
  for (const { id, points } of series) {
    for (const point of points) {
      const row = rows.get(point.t) ?? { t: point.t };
      row[id] = point.v;
      rows.set(point.t, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.t - b.t);
}

export function EquityChart({
  series,
  formatValue,
  label,
  height = 260,
  loading,
  baseline,
}: EquityChartProps) {
  const chart = useChartStyles();
  const gradientId = useId();
  const data = mergeSeries(series);
  const longest = series.reduce<readonly Point[]>(
    (acc, s) => (s.points.length > acc.length ? s.points : acc),
    [],
  );
  const single = series.length === 1 ? series[0] : undefined;

  return (
    <ChartFrame height={height} loading={loading} empty={data.length < 2} label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={single?.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={single?.color} stopOpacity={0} />
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
            tickFormatter={timeTickFormatter(seriesSpan(longest))}
            ticks={timeTicks(longest)}
            minTickGap={40}
          />
          <YAxis
            tick={chart.axisTick}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={formatValue}
            domain={['auto', 'auto']}
          />
          {baseline !== undefined ? (
            <ReferenceLine y={baseline} stroke={chart.cursor} strokeDasharray="4 4" />
          ) : null}
          <Tooltip
            cursor={{ stroke: chart.cursor, strokeDasharray: '3 3' }}
            content={({ active, payload, label: t }) =>
              active && payload?.length && typeof t === 'number' ? (
                <ChartTooltip
                  title={formatDateTime(t)}
                  rows={series.flatMap((s) => {
                    const entry = payload.find((item) => item.dataKey === s.id);
                    return typeof entry?.value === 'number'
                      ? [{ label: s.label, value: formatValue(entry.value), color: s.color }]
                      : [];
                  })}
                />
              ) : null
            }
          />
          {single ? (
            <Area
              type="monotone"
              dataKey={single.id}
              stroke={single.color}
              strokeWidth={1.75}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          ) : (
            series.map((s) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                stroke={s.color}
                strokeWidth={1.75}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
