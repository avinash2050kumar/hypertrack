import { OutlinedInput } from '@mui/material';
import type { OutlinedInputProps } from '@mui/material';
import { forwardRef } from 'react';

interface InputProps extends Omit<OutlinedInputProps, 'error'> {
  invalid?: boolean;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, mono, sx, ...props },
  ref,
) {
  return (
    <OutlinedInput
      inputRef={ref}
      fullWidth
      error={invalid}
      sx={[
        mono ? (theme) => ({ '& input': theme.typography.mono }) : false,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
});
