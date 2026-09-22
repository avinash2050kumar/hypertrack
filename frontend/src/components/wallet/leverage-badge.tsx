import { Box } from '@mui/material';

import { LEVERAGE_WARNING } from '../../data';
import { formatLeverage } from '../../domain';
import { Badge } from '../ui';

export function LeverageBadge({
  leverage,
  type,
}: {
  leverage: number;
  type?: 'cross' | 'isolated';
}) {
  return (
    <Badge tone={leverage >= LEVERAGE_WARNING ? 'warning' : 'neutral'} mono>
      {formatLeverage(leverage)}
      {type ? (
        <Box component="span" sx={{ fontWeight: 400, opacity: 0.7 }}>
          {type === 'cross' ? 'cross' : 'iso'}
        </Box>
      ) : null}
    </Badge>
  );
}
