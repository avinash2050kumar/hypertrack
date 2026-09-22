import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: ReactNode;
  aside?: ReactNode;
}

export function PageHeader({ title, subtitle, aside }: PageHeaderProps) {
  return (
    <Stack
      component="section"
      direction={{ xs: 'column', md: 'row' }}
      sx={{ gap: 2, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}
    >
      <Box>
        <Typography variant="h1">{title}</Typography>
        <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{subtitle}</Typography>
      </Box>
      {aside}
    </Stack>
  );
}
