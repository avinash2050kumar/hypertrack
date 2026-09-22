import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { isTimeWindow, type TimeWindow } from '../domain';

export function useSearchParam<T extends string>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = isValid(raw) ? raw : fallback;
  // useCallback: returned from a custom hook, so callers can safely use it as a dependency.
  const setValue = useCallback(
    (next: T) =>
      setParams((current) => {
        const updated = new URLSearchParams(current);
        if (next === fallback) updated.delete(key);
        else updated.set(key, next);
        return updated;
      }),
    [key, fallback, setParams],
  );
  return [value, setValue];
}

export function useTimeWindow(fallback: TimeWindow = '7d') {
  return useSearchParam<TimeWindow>('window', fallback, isTimeWindow);
}
