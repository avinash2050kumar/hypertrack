import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        px: 3,
        py: 6,
      }}
    >
      {icon ? (
        <Box
          aria-hidden="true"
          sx={{ mb: 1.5, color: 'text.disabled', display: 'flex', '& svg': { fontSize: 28 } }}
        >
          {icon}
        </Box>
      ) : null}
      <Typography variant="h3" component="h3">
        {title}
      </Typography>
      {description ? (
        <Typography component="div" sx={{ mt: 0.75, maxWidth: 448, color: 'text.secondary' }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2.5, width: '100%' }}>{action}</Box> : null}
    </Box>
  );
}
