import { Box, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { shortAddress } from '../../domain';
import { CopyButton, Num } from '../ui';

export function AddressChip({ address, link = false }: { address: string; link?: boolean }) {
  const text = (
    <Num size="0.75rem" title={address}>
      {shortAddress(address)}
    </Num>
  );
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: 'text.secondary' }}
    >
      {link ? (
        <Link
          component={RouterLink}
          to={`/wallet/${address}`}
          onClick={(event) => event.stopPropagation()}
          sx={{ '&:hover': { color: 'text.primary' } }}
        >
          {text}
        </Link>
      ) : (
        text
      )}
      <CopyButton value={address} label="Copy address" />
    </Box>
  );
}
