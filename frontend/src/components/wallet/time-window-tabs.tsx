import { TIME_WINDOW_LABELS, TIME_WINDOWS } from '../../data';
import type { TimeWindow } from '../../domain';
import { SegmentedControl } from '../ui';

const OPTIONS = TIME_WINDOWS.map((value) => ({ value, label: TIME_WINDOW_LABELS[value] }));

interface TimeWindowTabsProps {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
}

export function TimeWindowTabs({ value, onChange }: TimeWindowTabsProps) {
  return (
    <SegmentedControl label="Time window" options={OPTIONS} value={value} onChange={onChange} />
  );
}

export function windowLabel(window: TimeWindow): string {
  return window === 'all' ? 'all time' : TIME_WINDOW_LABELS[window];
}
