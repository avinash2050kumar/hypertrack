import { ADDRESS_PATTERN, TIME_WINDOWS } from '../data';
import type { TimeWindow } from './types';

export function parseAddress(input: string): string | null {
  const value = input.trim();
  return ADDRESS_PATTERN.test(value) ? value.toLowerCase() : null;
}

export function isTimeWindow(value: unknown): value is TimeWindow {
  return TIME_WINDOWS.some((window) => window === value);
}
