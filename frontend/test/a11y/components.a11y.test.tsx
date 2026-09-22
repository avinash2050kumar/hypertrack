import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditableText, ThemeToggle } from '../../src/components/ui';
import { AddressInput, LeverageBadge, PnlValue } from '../../src/components/wallet';
import { axeViolations } from '../utils/axe';
import { renderWithProviders } from '../utils/render';

describe('accessibility', () => {
  it('should have no violations in the address form', async () => {
    const { container } = renderWithProviders(<AddressInput onSubmit={() => 'added'} />);

    expect(await axeViolations(container)).toEqual([]);
  });

  it('should have no violations while the address form shows an error', async () => {
    const { container, user } = renderWithProviders(<AddressInput onSubmit={() => 'added'} />);

    await user.click(screen.getByRole('button', { name: 'Track' }));

    expect(await axeViolations(container)).toEqual([]);
  });

  it('should have no violations in the editable label in both states', async () => {
    const { container, user } = renderWithProviders(
      <EditableText
        value="Whale"
        placeholder="Add a label"
        label="Wallet label"
        onSave={vi.fn()}
      />,
    );
    expect(await axeViolations(container)).toEqual([]);

    await user.click(screen.getByRole('button'));

    expect(await axeViolations(container)).toEqual([]);
  });

  it('should have no violations in value badges and the theme toggle', async () => {
    const { container } = renderWithProviders(
      <>
        <PnlValue value={12} arrow />
        <LeverageBadge leverage={25} type="cross" />
        <ThemeToggle />
      </>,
    );

    expect(await axeViolations(container)).toEqual([]);
  });

  it('should let keyboard users reach and submit the address form', async () => {
    const onSubmit = vi.fn(() => 'added' as const);
    const { user } = renderWithProviders(<AddressInput onSubmit={onSubmit} />);

    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Wallet address' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Track' })).toHaveFocus();
  });
});
