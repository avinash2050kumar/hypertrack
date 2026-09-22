import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { ReactNode } from 'react';

interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const select = (_event: unknown, next: T | null) => {
    if (next !== null) onChange(next);
  };
  return (
    <ToggleButtonGroup exclusive value={value} onChange={select} aria-label={label} size="small">
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
