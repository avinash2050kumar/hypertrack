import { InfoOutlined } from '@mui/icons-material';
import { IconButton, Tooltip as MuiTooltip } from '@mui/material';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <MuiTooltip title={content} placement="top">
      <span style={{ display: 'inline-flex' }}>{children}</span>
    </MuiTooltip>
  );
}

export function InfoTip({ content }: { content: ReactNode }) {
  return (
    <MuiTooltip title={content} placement="top">
      <IconButton aria-label="More info" sx={{ p: 0.25 }}>
        <InfoOutlined sx={{ fontSize: 12 }} />
      </IconButton>
    </MuiTooltip>
  );
}
