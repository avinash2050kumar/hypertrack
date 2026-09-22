import { Box } from '@mui/material';
import type { ReactNode } from 'react';

type NumTone = 'inherit' | 'primary' | 'secondary' | 'disabled' | 'warning';

const COLOR: Record<NumTone, string> = {
  inherit: 'inherit',
  primary: 'text.primary',
  secondary: 'text.secondary',
  disabled: 'text.disabled',
  warning: 'warning.main',
};

interface NumProps {
  children: ReactNode;
  tone?: NumTone;
  size?: string;
  weight?: number;
  title?: string;
}

// Tabular monospace figures so columns of numbers line up.
export function Num({ children, tone = 'inherit', size, weight, title }: NumProps) {
  return (
    <Box
      component="span"
      title={title}
      sx={(theme) => ({
        ...theme.typography.mono,
        color: COLOR[tone],
        fontSize: size,
        fontWeight: weight,
      })}
    >
      {children}
    </Box>
  );
}
