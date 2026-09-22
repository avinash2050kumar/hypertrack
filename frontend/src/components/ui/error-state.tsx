import { ErrorOutlineRounded } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';

import { describeError } from '../../lib';
import { paletteOf } from '../../theme';
import { Button } from './button';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ error, onRetry, compact }: ErrorStateProps) {
  const copy = describeError(error);
  return (
    <Box
      role="alert"
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        border: 1,
        borderColor: theme.alpha(paletteOf(theme).error.main, 0.25),
        bgcolor: theme.alpha(paletteOf(theme).error.main, 0.05),
      })}
    >
      <ErrorOutlineRounded sx={{ color: 'error.main', fontSize: 18, mt: 0.25 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 500 }}>{copy.title}</Typography>
        <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
          {copy.message}
        </Typography>
      </Box>
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          Retry now
        </Button>
      ) : null}
    </Box>
  );
}
