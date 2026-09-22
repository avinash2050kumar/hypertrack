import { Box, Card as MuiCard, Stack, Typography } from '@mui/material';
import type { BoxProps, CardProps } from '@mui/material';
import type { ReactNode } from 'react';

export function Card(props: CardProps) {
  return <MuiCard {...props} />;
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 1.5,
        px: { xs: 2, sm: 2.5 },
        pt: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h2" component="h2" sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" component="div" sx={{ mt: 0.25, color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

export function CardBody({ sx, ...props }: BoxProps) {
  return <Box sx={[{ p: { xs: 2, sm: 2.5 } }, ...(Array.isArray(sx) ? sx : [sx])]} {...props} />;
}
