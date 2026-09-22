import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCompact, formatDateTime, formatPnl } from '../../domain';
import {
  ChartFrame,
  ChartTooltip,
  seriesSpan,
  timeTickFormatter,
  useChartStyles,
  type Point,
} from './chart-frame';
import { pnlColor } from './pnl-value';

interface PnlBarChartProps {
  points: readonly Point[];
  label: string;
  height?: number;
  loading?: boolean;
  formatX?: (t: number) => string;
  layout?: 'vertical' | 'horizontal';
}

export function PnlBarChart({
  points,
  label,
  height = 220,
  loading,
  formatX,
  layout = 'vertical',
}: PnlBarChartProps) {
  const chart = useChartStyles();
  const xFormat = formatX ?? timeTickFormatter(seriesSpan(points));
  const tooltipTitle = formatX ?? formatDateTime;
  const horizontal = layout === 'horizontal';
  const data = [...points];

  return (
    <ChartFrame height={height} loading={loading} empty={points.length === 0} label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke={chart.grid}
            strokeDasharray="2 4"
            vertical={horizontal}
            horizontal={!horizontal}
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                dataKey="v"
                tick={chart.axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompact}
              />
              <YAxis
                type="category"
                dataKey="t"
                tick={chart.axisTick}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={xFormat}
                interval={0}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="t"
                tick={chart.axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={xFormat}
                minTickGap={24}
              />
              <YAxis
                tick={chart.axisTick}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={formatCompact}
              />
            </>
          )}
          <ReferenceLine {...(horizontal ? { x: 0 } : { y: 0 })} stroke={chart.grid} />
          <Tooltip
            cursor={{ fill: chart.cursorFill, opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload;
              if (!active || !point || typeof point.t !== 'number' || typeof point.v !== 'number')
                return null;
              return (
                <ChartTooltip
                  title={tooltipTitle(point.t)}
                  rows={[
                    {
                      label: 'PnL',
                      value: formatPnl(point.v),
                      color: pnlColor(chart.theme, point.v),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="v" radius={2} isAnimationActive={false} maxBarSize={28}>
            {data.map((point) => (
              <Cell key={point.t} fill={pnlColor(chart.theme, point.v)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
