import { Box } from '@mui/material';

import { MetricTile, type MetricTileProps } from './metric-tile';

export interface StatItem extends Omit<MetricTileProps, 'loading'> {
  id: string;
}

interface StatGridProps {
  items: readonly StatItem[];
  loading?: boolean;
  columns?: 2 | 3 | 4 | 6;
}

const COLUMNS = {
  2: { xs: 2 },
  3: { xs: 2, sm: 3 },
  4: { xs: 2, lg: 4 },
  6: { xs: 2, sm: 3, xl: 6 },
} as const;

export function StatGrid({ items, loading, columns = 4 }: StatGridProps) {
  const counts: Record<string, number> = COLUMNS[columns];
  const gridTemplateColumns = Object.fromEntries(
    Object.entries(counts).map(([breakpoint, count]) => [
      breakpoint,
      `repeat(${count}, minmax(0, 1fr))`,
    ]),
  );
  return (
    <Box sx={{ display: 'grid', gap: { xs: 1, sm: 1.5 }, gridTemplateColumns }}>
      {items.map(({ id, ...item }) => (
        <MetricTile key={id} loading={loading} {...item} />
      ))}
    </Box>
  );
}
