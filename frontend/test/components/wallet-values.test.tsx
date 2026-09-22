import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeverageBadge, PnlValue } from '../../src/components/wallet';
import { pnlTone } from '../../src/components/wallet/pnl-value';
import { renderWithProviders } from '../utils/render';

describe('pnlTone', () => {
  it.each([
    [12, 'usd', 'positive'],
    [-12, 'usd', 'negative'],
    [0.004, 'usd', 'neutral'],
    [0.00001, 'pct', 'neutral'],
    [0.01, 'pct', 'positive'],
    [null, 'usd', 'neutral'],
    [Number.NaN, 'usd', 'neutral'],
  ] as const)('should classify %s (%s) as %s', (value, format, tone) => {
    expect(pnlTone(value, format)).toBe(tone);
  });
});

describe('PnlValue', () => {
  it('should render a signed dollar amount', () => {
    renderWithProviders(<PnlValue value={1234.5} />);

    expect(screen.getByText('+$1,234.50')).toBeInTheDocument();
  });

  it('should render a signed percentage', () => {
    renderWithProviders(<PnlValue value={-0.052} format="pct" />);

    expect(screen.getByText('−5.20%')).toBeInTheDocument();
  });

  it('should compact large values when asked', () => {
    renderWithProviders(<PnlValue value={25_000} compact />);

    expect(screen.getByText('+$25.00K')).toBeInTheDocument();
  });

  it('should show a decorative arrow that screen readers skip', () => {
    const { container } = renderWithProviders(<PnlValue value={-10} arrow />);

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('▼');
  });

  it('should not show an arrow for neutral values', () => {
    const { container } = renderWithProviders(<PnlValue value={0} arrow />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('should render missing values as an em dash', () => {
    renderWithProviders(<PnlValue value={null} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should colour gains and losses differently', () => {
    renderWithProviders(
      <>
        <PnlValue value={10} />
        <PnlValue value={-10} />
      </>,
    );

    const gain = getComputedStyle(screen.getByText('+$10.00')).color;
    const loss = getComputedStyle(screen.getByText('−$10.00')).color;
    expect(gain).not.toBe(loss);
  });
});

describe('LeverageBadge', () => {
  it('should show leverage and the margin mode', () => {
    renderWithProviders(<LeverageBadge leverage={5} type="isolated" />);

    expect(screen.getByText('5×')).toBeInTheDocument();
    expect(screen.getByText('iso')).toBeInTheDocument();
  });

  it('should use a warning style from 20x upward', () => {
    renderWithProviders(
      <>
        <LeverageBadge leverage={19} />
        <LeverageBadge leverage={20} />
      </>,
    );

    const safe = getComputedStyle(screen.getByText('19×')).color;
    const risky = getComputedStyle(screen.getByText('20×')).color;
    expect(risky).not.toBe(safe);
  });
});
