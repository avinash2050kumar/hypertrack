import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import batchFixture from '../../e2e/fixtures/batch.json';
import DashboardPage from '../../src/pages/dashboard/dashboard-page';
import { useWatchlistStore } from '../../src/store';
import { axeViolations } from '../utils/axe';
import { ADDRESS } from '../utils/fixtures';
import { renderWithProviders } from '../utils/render';

function stubBatchApi() {
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () =>
      new Response(JSON.stringify(batchFixture), {
        headers: { 'content-type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useWatchlistStore.setState({ wallets: [] });
  });

  it('should show the empty state with example wallets', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
    expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /HLP vault/ })).toBeInTheDocument();
  });

  it('should track a pasted wallet and load its summary', async () => {
    const fetch = stubBatchApi();
    const { user } = renderWithProviders(<DashboardPage />);

    await user.type(screen.getByRole('textbox', { name: 'Wallet address' }), `${ADDRESS}{Enter}`);

    const table = await screen.findByRole('table', { name: 'Tracked wallets' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith(
      '/api/wallets/batch',
      expect.objectContaining({ body: JSON.stringify({ addresses: [ADDRESS], window: '7d' }) }),
    );
    await waitFor(() => expect(screen.getByText(/Updated/)).toBeInTheDocument());
  });

  it('should add an example wallet with its label', async () => {
    stubBatchApi();
    const { user } = renderWithProviders(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: /Whale/ }));

    expect(useWatchlistStore.getState().wallets).toEqual([
      expect.objectContaining({ address: ADDRESS, label: 'Whale' }),
    ]);
  });

  it('should remove a wallet and restore it with undo', async () => {
    stubBatchApi();
    useWatchlistStore.getState().add(ADDRESS, 'Whale');
    const { user } = renderWithProviders(<DashboardPage />);

    await user.click(await screen.findByRole('button', { name: 'Remove Whale from watchlist' }));
    expect(await screen.findByText('Removed Whale')).toBeInTheDocument();
    expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(await screen.findByRole('table', { name: 'Tracked wallets' })).toBeInTheDocument();
  });

  it('should pause auto-refresh when toggled off', async () => {
    stubBatchApi();
    useWatchlistStore.getState().add(ADDRESS, 'Whale');
    const { user } = renderWithProviders(<DashboardPage />);

    await user.click(await screen.findByRole('switch', { name: 'Auto-refresh' }));

    expect(await screen.findByText(/· paused/)).toBeInTheDocument();
  });

  it('should explain when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    useWatchlistStore.getState().add(ADDRESS, 'Whale');
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Can't reach the HyperTrack API")).toBeInTheDocument();
  });

  it('should only offer comparison with two or more wallets', async () => {
    stubBatchApi();
    useWatchlistStore.getState().add(ADDRESS, 'Whale');
    renderWithProviders(<DashboardPage />);
    await screen.findByRole('table', { name: 'Tracked wallets' });

    expect(screen.queryByRole('link', { name: /Compare top/ })).not.toBeInTheDocument();
  });

  it('should switch the table to a list on small screens', async () => {
    window.innerWidth = 375;
    stubBatchApi();
    useWatchlistStore.getState().add(ADDRESS, 'Whale');
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('list', { name: 'Tracked wallets' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should have no accessibility violations with data loaded', async () => {
    stubBatchApi();
    useWatchlistStore.getState().add(ADDRESS, 'Whale');
    const { container } = renderWithProviders(<DashboardPage />);
    await screen.findByRole('table', { name: 'Tracked wallets' });

    expect(await axeViolations(container)).toEqual([]);
  });
});
