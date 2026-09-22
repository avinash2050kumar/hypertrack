import { Box } from '@mui/material';
import type { ReactNode } from 'react';

import { toneColor, type Tone } from '../../theme';

interface BadgeProps {
  tone?: Tone;
  mono?: boolean;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', mono, children }: BadgeProps) {
  return (
    <Box
      component="span"
      sx={(theme) => {
        const color = toneColor(theme, tone);
        const neutral = tone === 'neutral';
        return {
          ...(mono ? theme.typography.mono : {}),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          border: 1,
          fontSize: '0.6875rem',
          fontWeight: 500,
          lineHeight: 1.2,
          color,
          borderColor: neutral ? 'divider' : theme.alpha(color, 0.25),
          bgcolor: neutral ? 'raised' : theme.alpha(color, 0.1),
        };
      }}
    >
      {children}
    </Box>
  );
}
