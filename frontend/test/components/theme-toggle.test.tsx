import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThemeToggle } from '../../src/components/ui';
import { renderWithProviders } from '../utils/render';

describe('ThemeToggle', () => {
  it('should offer the opposite of the current theme', () => {
    renderWithProviders(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('should switch themes and update its label', async () => {
    const { user } = renderWithProviders(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('should remember the chosen theme', async () => {
    const { user } = renderWithProviders(<ThemeToggle />);

    await user.click(screen.getByRole('button'));

    expect(Object.values({ ...localStorage })).toContain('light');
  });
});
