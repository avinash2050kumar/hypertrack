import { Box } from '@mui/material';

import { SortableTable, type Column } from '../../components/ui';
import { METRICS, type MetricDef } from '../../components/wallet';
import { COMPARE_TABLE_METRICS } from '../../data';
import type { WalletOverview } from '../../domain';
import { paletteOf, visuallyHidden } from '../../theme';

export interface Slot {
  address: string;
  color: string;
  label: string;
  overview: WalletOverview | undefined;
  loading: boolean;
  error: unknown;
}

function bestIndex(def: MetricDef, slots: readonly Slot[]): number | null {
  if (!def.better) return null;
  const values = slots.flatMap((slot, index) => {
    const value = slot.overview ? def.value(slot.overview) : null;
    return value === null ? [] : [{ index, value }];
  });
  if (values.length < 2) return null;
  const best = values.reduce((a, b) =>
    (def.better === 'higher' ? b.value > a.value : b.value < a.value) ? b : a,
  );
  return best.index;
}

export function ComparisonTable({ slots }: { slots: readonly Slot[] }) {
  const columns: Column<MetricDef>[] = [
    {
      key: 'metric',
      header: 'Metric',
      render: (def) => (
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {def.label}
        </Box>
      ),
    },
    ...slots.map<Column<MetricDef>>((slot, index) => ({
      key: slot.address,
      header: (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          <Box
            component="span"
            aria-hidden="true"
            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: slot.color }}
          />
          {slot.label}
        </Box>
      ),
      align: 'right',
      render: (def) => {
        const isBest = bestIndex(def, slots) === index;
        return (
          <Box
            component="span"
            sx={(theme) => {
              const accent = paletteOf(theme).primary.main;
              return {
                ...theme.typography.mono,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                ...(isBest && {
                  bgcolor: theme.alpha(accent, 0.1),
                  boxShadow: `inset 0 0 0 1px ${theme.alpha(accent, 0.4)}`,
                }),
              };
            }}
          >
            {isBest ? (
              <Box component="span" sx={visuallyHidden}>
                Best:
              </Box>
            ) : null}
            {slot.overview ? def.render(def.value(slot.overview)) : '…'}
          </Box>
        );
      },
    })),
  ];

  return (
    <SortableTable
      label="Metric comparison"
      columns={columns}
      rows={COMPARE_TABLE_METRICS.map((id): MetricDef => METRICS[id])}
      getRowKey={(def) => def.id}
    />
  );
}
