import { CheckRounded, ContentCopyRounded } from '@mui/icons-material';
import { IconButton } from '@mui/material';

import { useCopy } from '../../hooks';

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const { copied, copy } = useCopy();
  return (
    <IconButton
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      onClick={(event) => {
        event.stopPropagation();
        void copy(value);
      }}
      sx={{
        p: 0.5,
        ...(copied && { color: 'success.main', '&:hover': { color: 'success.main' } }),
      }}
    >
      {copied ? (
        <CheckRounded sx={{ fontSize: 14 }} />
      ) : (
        <ContentCopyRounded sx={{ fontSize: 14 }} />
      )}
    </IconButton>
  );
}
