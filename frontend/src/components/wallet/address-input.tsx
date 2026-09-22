import { Box, Stack, Typography } from '@mui/material';
import { useId, useState, type FormEvent } from 'react';

import { ADDRESS_INPUT_ERRORS } from '../../data';
import { parseAddress } from '../../domain';
import { useDebouncedValue } from '../../hooks';
import { Button, Input } from '../ui';

export type AddressSubmitResult = 'added' | 'duplicate';

interface AddressInputProps {
  onSubmit: (address: string) => AddressSubmitResult;
  submitLabel?: string;
  autoFocus?: boolean;
}

export function AddressInput({ onSubmit, submitLabel = 'Track', autoFocus }: AddressInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const settled = useDebouncedValue(value, 300);
  const looksValid = !error && settled === value && parseAddress(settled) !== null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return setError(ADDRESS_INPUT_ERRORS.empty);
    const address = parseAddress(value);
    if (!address) return setError(ADDRESS_INPUT_ERRORS.invalid);
    if (onSubmit(address) === 'duplicate') return setError(ADDRESS_INPUT_ERRORS.duplicate);
    setValue('');
    setError(null);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
      <Stack direction="row" sx={{ gap: 1 }}>
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="0x… paste any Hyperliquid address"
          invalid={Boolean(error)}
          autoFocus={autoFocus}
          mono
          inputProps={{
            'aria-label': 'Wallet address',
            'aria-describedby': error ? errorId : undefined,
            spellCheck: false,
            autoComplete: 'off',
          }}
        />
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </Stack>
      {error ? (
        <Typography
          id={errorId}
          role="alert"
          variant="body2"
          sx={{ mt: 0.75, color: 'error.main' }}
        >
          {error}
        </Typography>
      ) : null}
      {looksValid ? (
        <Typography variant="body2" sx={{ mt: 0.75, color: 'success.main' }}>
          ✓ Valid address — press Enter to add
        </Typography>
      ) : null}
    </Box>
  );
}
