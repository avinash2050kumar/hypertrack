import { CircularProgress, Button as MuiButton } from '@mui/material';
import type { ButtonProps as MuiButtonProps } from '@mui/material';
import { forwardRef, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size' | 'color'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const MUI_VARIANT: Record<Variant, MuiButtonProps['variant']> = {
  primary: 'contained',
  secondary: 'outlined',
  ghost: 'text',
  danger: 'danger',
};

const MUI_SIZE: Record<Size, MuiButtonProps['size']> = { sm: 'small', md: 'medium' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, disabled, startIcon, ...props },
  ref,
) {
  return (
    <MuiButton
      ref={ref}
      variant={MUI_VARIANT[variant]}
      size={MUI_SIZE[size]}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={14} color="inherit" /> : startIcon}
      {...props}
    />
  );
});

interface LinkButtonProps {
  to: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function LinkButton({ to, variant = 'secondary', size = 'sm', children }: LinkButtonProps) {
  return (
    <MuiButton component={RouterLink} to={to} variant={MUI_VARIANT[variant]} size={MUI_SIZE[size]}>
      {children}
    </MuiButton>
  );
}
