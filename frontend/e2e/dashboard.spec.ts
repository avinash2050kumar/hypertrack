import { expect, test } from '@playwright/test';

import { mockApi, seedWatchlist, WHALE } from './support/mock-api';

const SECOND = '0x0000000000000000000000000000000000000002';

test.describe('watchlist dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('should show the empty state on first visit', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Watchlist', exact: true })).toBeVisible();
    await expect(page.getByText('Your watchlist is empty')).toBeVisible();
  });

  test('should track a wallet pasted into the address field', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('textbox', { name: 'Wallet address' }).fill(WHALE);
    await page.getByRole('button', { name: 'Track' }).click();

    const table = page.getByRole('table', { name: 'Tracked wallets' });
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(page.getByText('Tracked value')).toBeVisible();
  });

  test('should reject an invalid address', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('textbox', { name: 'Wallet address' }).fill('0xnope');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('alert')).toContainText('isn’t a valid address');
  });

  test('should keep the watchlist after a reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Wallet address' }).fill(WHALE);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table', { name: 'Tracked wallets' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('table', { name: 'Tracked wallets' }).getByRole('row')).toHaveCount(
      2,
    );
  });

  test('should rename a wallet inline', async ({ page }) => {
    await seedWatchlist(page, [{ address: WHALE, label: 'Whale' }]);
    await page.goto('/');

    await page.getByRole('button', { name: /Wallet label: Whale/ }).click();
    await page.getByRole('textbox', { name: 'Wallet label' }).fill('Big fish');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('button', { name: /Wallet label: Big fish/ })).toBeVisible();
  });

  test('should undo removing a wallet', async ({ page }) => {
    await seedWatchlist(page, [{ address: WHALE, label: 'Whale' }]);
    await page.goto('/');

    await page.getByRole('button', { name: 'Remove Whale from watchlist' }).click();
    await expect(page.getByText('Your watchlist is empty')).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByRole('table', { name: 'Tracked wallets' })).toBeVisible();
  });

  test('should open the comparison for tracked wallets', async ({ page }) => {
    await seedWatchlist(page, [
      { address: WHALE, label: 'Whale' },
      { address: SECOND, label: 'Second' },
    ]);
    await page.goto('/');

    await page.getByRole('link', { name: 'Compare top 2' }).click();

    await expect(page).toHaveURL(`/compare?addresses=${WHALE},${SECOND}`);
    await expect(page.getByRole('heading', { name: 'Compare wallets' })).toBeVisible();
  });

  test('should refresh the batch every 15 seconds while auto-refresh is on', async ({ page }) => {
    await page.clock.install();
    const log = await mockApi(page);
    await seedWatchlist(page, [{ address: WHALE, label: 'Whale' }]);
    await page.goto('/');
    await expect(page.getByRole('table', { name: 'Tracked wallets' })).toBeVisible();
    const before = log.requests.filter((url) => url.pathname === '/api/wallets/batch').length;

    await page.clock.runFor(16_000);

    await expect
      .poll(() => log.requests.filter((url) => url.pathname === '/api/wallets/batch').length)
      .toBeGreaterThan(before);
  });
});
