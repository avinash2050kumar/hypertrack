import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AddressInput } from '../../src/components/wallet';
import { ADDRESS } from '../utils/fixtures';
import { renderWithProviders } from '../utils/render';

function setup(result: 'added' | 'duplicate' = 'added') {
  const onSubmit = vi.fn(() => result);
  const utils = renderWithProviders(<AddressInput onSubmit={onSubmit} />);
  return { ...utils, onSubmit, input: screen.getByRole('textbox', { name: 'Wallet address' }) };
}

describe('AddressInput', () => {
  it('should render the address field and the track button', () => {
    setup();

    expect(screen.getByPlaceholderText('0x… paste any Hyperliquid address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Track' })).toBeInTheDocument();
  });

  it('should submit a valid address in lowercase and clear the field', async () => {
    const { user, input, onSubmit } = setup();

    await user.type(input, `  0x${ADDRESS.slice(2).toUpperCase()}  {Enter}`);

    expect(onSubmit).toHaveBeenCalledWith(ADDRESS);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should ask for an address when submitted empty', async () => {
    const { user, onSubmit } = setup();

    await user.click(screen.getByRole('button', { name: 'Track' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Paste a wallet address to track it.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should explain the expected format for an invalid address', async () => {
    const { user, input, onSubmit } = setup();

    await user.type(input, '0x1234{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      /expected 0x followed by 40 hex characters/,
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should link the error message to the field for screen readers', async () => {
    const { user, input } = setup();

    await user.type(input, 'nope{Enter}');

    expect(input).toHaveAccessibleDescription(/isn’t a valid address/);
  });

  it('should keep the text and warn when the wallet is already tracked', async () => {
    const { user, input } = setup('duplicate');

    await user.type(input, `${ADDRESS}{Enter}`);

    expect(screen.getByRole('alert')).toHaveTextContent('Already on your watchlist.');
    expect(input).toHaveValue(ADDRESS);
  });

  it('should clear the error as soon as the user edits the field', async () => {
    const { user, input } = setup();
    await user.type(input, 'bad{Enter}');

    await user.type(input, 'x');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should confirm a valid address once typing settles', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user, input } = setup();

    await user.type(input, ADDRESS);
    expect(screen.queryByText(/Valid address/)).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(screen.getByText('✓ Valid address — press Enter to add')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
