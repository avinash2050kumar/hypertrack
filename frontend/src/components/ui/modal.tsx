import { CloseRounded } from '@mui/icons-material';
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material';
import { useId, type ReactNode } from 'react';

const WIDTHS = { sm: 512, lg: 1024 } as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof WIDTHS;
}

export function Modal({ open, onClose, title, children, footer, size = 'sm' }: ModalProps) {
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={false}
      slotProps={{ paper: { sx: { maxWidth: WIDTHS[size] } } }}
    >
      <Box sx={{ p: 2.5 }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}
        >
          <Typography id={titleId} variant="h2" component="h2" sx={{ fontSize: '1rem' }}>
            {title}
          </Typography>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>
        {children}
        {footer ? (
          <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, mt: 2.5 }}>
            {footer}
          </Stack>
        ) : null}
      </Box>
    </Dialog>
  );
}
