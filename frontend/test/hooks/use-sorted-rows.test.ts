import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSortedRows, type SortValue } from '../../src/hooks/use-sorted-rows';

interface Row {
  name: string;
  pnl: number | null;
}

const rows: Row[] = [
  { name: 'wallet 10', pnl: 5 },
  { name: 'wallet 2', pnl: null },
  { name: 'Wallet 1', pnl: -3 },
  { name: 'wallet 3', pnl: 12 },
];
const accessors: Record<string, (row: Row) => SortValue> = {
  name: (row) => row.name,
  pnl: (row) => row.pnl,
};

describe('useSortedRows', () => {
  it('should keep the original order without a sort', () => {
    const { result } = renderHook(() => useSortedRows(rows, accessors, null));

    expect(result.current.rows).toEqual(rows);
  });

  it('should sort descending first, then ascending on a second toggle', () => {
    const { result } = renderHook(() => useSortedRows(rows, accessors, null));

    act(() => result.current.toggle('pnl'));
    expect(result.current.rows.map((row) => row.pnl)).toEqual([12, 5, -3, null]);

    act(() => result.current.toggle('pnl'));
    expect(result.current.sort).toEqual({ key: 'pnl', direction: 'asc' });
    expect(result.current.rows.map((row) => row.pnl)).toEqual([-3, 5, 12, null]);
  });

  it('should always sink empty values to the bottom', () => {
    const { result } = renderHook(() =>
      useSortedRows(rows, accessors, { key: 'pnl', direction: 'asc' }),
    );

    expect(result.current.rows.at(-1)?.pnl).toBeNull();
  });

  it('should compare text naturally and case-insensitively', () => {
    const { result } = renderHook(() =>
      useSortedRows(rows, accessors, { key: 'name', direction: 'asc' }),
    );

    expect(result.current.rows.map((row) => row.name)).toEqual([
      'Wallet 1',
      'wallet 2',
      'wallet 3',
      'wallet 10',
    ]);
  });

  it('should restart at descending when switching columns', () => {
    const { result } = renderHook(() =>
      useSortedRows(rows, accessors, { key: 'name', direction: 'asc' }),
    );

    act(() => result.current.toggle('pnl'));

    expect(result.current.sort).toEqual({ key: 'pnl', direction: 'desc' });
  });

  it('should not mutate the input rows', () => {
    const input = [...rows];
    renderHook(() => useSortedRows(input, accessors, { key: 'pnl', direction: 'desc' }));

    expect(input).toEqual(rows);
  });
});
