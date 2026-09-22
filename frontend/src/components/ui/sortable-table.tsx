import { ArrowDownwardRounded, ArrowUpwardRounded } from '@mui/icons-material';
import {
  Box,
  IconButton,
  NativeSelect,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { useId, useMemo, type KeyboardEvent, type ReactNode } from 'react';

import { useIsDesktop, useSortedRows, type SortState, type SortValue } from '../../hooks';
import { paletteOf } from '../../theme';

type Align = 'left' | 'right' | 'center';

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: Align;
  width?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => SortValue;
  hideInCard?: boolean;
}

interface SortableTableProps<T> {
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  label: string;
  defaultSort?: SortState;
  onRowClick?: (row: T) => void;
  // Fires on hover/focus so callers can prefetch what a click will need.
  onRowIntent?: (row: T) => void;
  rowLabel?: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
}

interface ViewProps<T> extends SortableTableProps<T> {
  sort: SortState | null;
  onSort: (key: string) => void;
}

function activateOnKey(event: KeyboardEvent, action: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
}

type RowInteraction<T> = Pick<SortableTableProps<T>, 'onRowClick' | 'onRowIntent' | 'rowLabel'>;

function rowHandlers<T>(row: T, { onRowClick, onRowIntent, rowLabel }: RowInteraction<T>) {
  if (!onRowClick) return {};
  const intent = onRowIntent ? () => onRowIntent(row) : undefined;
  return {
    tabIndex: 0,
    'aria-label': rowLabel?.(row),
    onClick: () => onRowClick(row),
    onKeyDown: (event: KeyboardEvent) => activateOnKey(event, () => onRowClick(row)),
    onMouseEnter: intent,
    onFocus: intent,
    onTouchStart: intent,
  };
}

export function SortableTable<T>(props: SortableTableProps<T>) {
  const { columns, rows, defaultSort, loading, empty } = props;
  const desktop = useIsDesktop();
  // useMemo: a dependency of useSortedRows' memo, so it must keep its identity while columns do.
  const accessors = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, column.sortValue])),
    [columns],
  );
  const sorted = useSortedRows(rows, accessors, defaultSort ?? null);

  if (!loading && rows.length === 0 && empty) return <>{empty}</>;
  const view = { ...props, rows: sorted.rows, sort: sorted.sort, onSort: sorted.toggle };
  return desktop ? <DesktopTable {...view} /> : <CardList {...view} />;
}

function HeaderCell<T>({
  column,
  sort,
  onSort,
}: {
  column: Column<T>;
  sort: SortState | null;
  onSort: (key: string) => void;
}) {
  const active = sort?.key === column.key;
  const direction = active ? sort.direction : false;
  return (
    <TableCell
      align={column.align}
      sortDirection={column.sortValue ? direction : undefined}
      sx={{ width: column.width }}
    >
      {column.sortValue ? (
        <TableSortLabel
          active={active}
          direction={active ? sort.direction : 'desc'}
          onClick={() => onSort(column.key)}
          sx={column.align === 'right' ? { flexDirection: 'row-reverse' } : undefined}
        >
          {column.header}
        </TableSortLabel>
      ) : (
        column.header
      )}
    </TableCell>
  );
}

function DesktopTable<T>({
  columns,
  rows,
  getRowKey,
  label,
  sort,
  onSort,
  onRowClick,
  onRowIntent,
  rowLabel,
  loading,
  skeletonRows = 5,
}: ViewProps<T>) {
  return (
    <TableContainer>
      <Table aria-label={label}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <HeaderCell key={column.key} column={column} sort={sort} onSort={onSort} />
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.align}>
                      <Skeleton
                        width={64}
                        height={16}
                        sx={{ ml: column.align === 'right' ? 'auto' : 0 }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  hover={Boolean(onRowClick)}
                  sx={onRowClick ? { cursor: 'pointer', outlineOffset: -2 } : undefined}
                  {...rowHandlers(row, { onRowClick, onRowIntent, rowLabel })}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.align}>
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CardSortPicker<T>({
  columns,
  sort,
  onSort,
}: Pick<ViewProps<T>, 'columns' | 'sort' | 'onSort'>) {
  const id = useId();
  const sortable = columns.filter((column) => column.sortValue);
  if (!sortable.length) return null;
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        px: 2,
        pb: 1,
        color: 'text.secondary',
      }}
    >
      <Typography component="label" htmlFor={id} variant="body2">
        Sort
      </Typography>
      <NativeSelect
        id={id}
        value={sort?.key ?? ''}
        onChange={(event) => onSort(event.target.value)}
        disableUnderline
        sx={{
          fontSize: '0.75rem',
          px: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        {!sort ? <option value="">—</option> : null}
        {sortable.map((column) => (
          <option key={column.key} value={column.key}>
            {typeof column.header === 'string' ? column.header : column.key}
          </option>
        ))}
      </NativeSelect>
      {sort ? (
        <IconButton
          onClick={() => onSort(sort.key)}
          aria-label={`Sort ${sort.direction === 'desc' ? 'ascending' : 'descending'}`}
          sx={{ border: 1, borderColor: 'divider', color: 'text.primary' }}
        >
          {sort.direction === 'desc' ? (
            <ArrowDownwardRounded sx={{ fontSize: 14 }} />
          ) : (
            <ArrowUpwardRounded sx={{ fontSize: 14 }} />
          )}
        </IconButton>
      ) : null}
    </Stack>
  );
}

function CardList<T>({
  columns,
  rows,
  getRowKey,
  label,
  sort,
  onSort,
  onRowClick,
  onRowIntent,
  rowLabel,
  loading,
  skeletonRows = 3,
}: ViewProps<T>) {
  const [titleColumn, ...rest] = columns;
  const detailColumns = rest.filter((column) => !column.hideInCard);
  if (!titleColumn) return null;

  return (
    <Box aria-label={label} role="list">
      <CardSortPicker columns={columns} sort={sort} onSort={onSort} />
      <Stack sx={{ gap: 1, px: 1.5, pb: 1.5 }}>
        {loading
          ? Array.from({ length: skeletonRows }, (_, i) => (
              <Skeleton key={i} height={112} sx={{ borderRadius: 2 }} />
            ))
          : rows.map((row) => (
              <Box
                key={getRowKey(row)}
                role="listitem"
                {...rowHandlers(row, { onRowClick, onRowIntent, rowLabel })}
                sx={(theme) => ({
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: theme.alpha(paletteOf(theme).background.default, 0.4),
                  ...(onRowClick && { cursor: 'pointer', '&:active': { bgcolor: 'raised' } }),
                })}
              >
                <Box sx={{ mb: 1 }}>{titleColumn.render(row)}</Box>
                <Box
                  component="dl"
                  sx={{
                    m: 0,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    columnGap: 2,
                    rowGap: 0.75,
                    fontSize: '0.75rem',
                  }}
                >
                  {detailColumns.map((column) => (
                    <Stack
                      key={column.key}
                      direction="row"
                      sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                    >
                      <Box component="dt" sx={{ color: 'text.disabled' }}>
                        {column.header}
                      </Box>
                      <Box component="dd" sx={{ m: 0, textAlign: 'right' }}>
                        {column.render(row)}
                      </Box>
                    </Stack>
                  ))}
                </Box>
              </Box>
            ))}
      </Stack>
    </Box>
  );
}
