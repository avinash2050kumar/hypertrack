import { Typography } from '@mui/material';

import { formatDateTime, formatNumber, type FillCoverage } from '../../domain';
import { paletteOf } from '../../theme';

export function FillCoverageNote({ coverage }: { coverage: FillCoverage }) {
  if (!coverage.truncated) return null;
  return (
    <Typography
      variant="body2"
      sx={(theme) => ({
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: 1,
        borderColor: theme.alpha(paletteOf(theme).warning.main, 0.25),
        bgcolor: theme.alpha(paletteOf(theme).warning.main, 0.05),
        color: 'text.secondary',
      })}
    >
      Built from the most recent {formatNumber(coverage.count, 0)} fills (since{' '}
      {formatDateTime(coverage.oldest)}). This wallet trades more than we page through per request,
      so older fills in the window aren’t included. PnL, ROI, drawdown and Sharpe use full portfolio
      history and are unaffected.
    </Typography>
  );
}
