import { useMemo, useState } from 'react';

type SortDirection = 'asc' | 'desc';
export type SortValue = number | string | null | undefined;

export interface SortState {
  key: string;
  direction: SortDirection;
}

function compare(a: SortValue, b: SortValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

// Nulls always sink to the bottom regardless of direction.
function sortRows<T>(
  rows: readonly T[],
  getValue: (row: T) => SortValue,
  direction: SortDirection,
): T[] {
  return [...rows].sort((left, right) => {
    const a = getValue(left);
    const b = getValue(right);
    if (a === null || a === undefined || b === null || b === undefined) return compare(a, b);
    return direction === 'asc' ? compare(a, b) : compare(b, a);
  });
}

export function useSortedRows<T>(
  rows: readonly T[],
  accessors: Record<string, ((row: T) => SortValue) | undefined>,
  initial: SortState | null,
) {
  const [sort, setSort] = useState<SortState | null>(initial);

  // useMemo: sorting can cover 1000+ fills after "load more"; skip it unless rows or sort change.
  const sorted = useMemo(() => {
    const accessor = sort ? accessors[sort.key] : undefined;
    return sort && accessor ? sortRows(rows, accessor, sort.direction) : [...rows];
  }, [rows, accessors, sort]);

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: 'desc' },
    );

  return { rows: sorted, sort, toggle };
}
