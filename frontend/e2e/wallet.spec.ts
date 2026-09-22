import { expect, test } from '@playwright/test';

import { mockApi, mockLiveSocket, WHALE } from './support/mock-api';

test.describe('wallet detail', () => {
  test('should load the overview for a wallet link', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/wallet/${WHALE}`);

    await expect(page.getByRole('tab', { name: 'Overview', selected: true })).toBeVisible();
    await expect(page.getByRole('figure', { name: 'Account value over time' })).toBeVisible();
  });

  test('should keep the selected tab in the URL', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/wallet/${WHALE}`);

    await page.getByRole('tab', { name: 'Positions' }).click();

    await expect(page).toHaveURL(/tab=positions/);
    await expect(page.getByRole('table', { name: 'Open positions' })).toBeVisible();
  });

  test('should open a deep link on the right tab', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/wallet/${WHALE}?tab=performance`);

    await expect(page.getByRole('tab', { name: 'Performance', selected: true })).toBeVisible();
  });

  test('should request data for the chosen time window', async ({ page }) => {
    const log = await mockApi(page);
    await page.goto(`/wallet/${WHALE}`);

    await page.getByRole('button', { name: '30D' }).click();

    await expect(page).toHaveURL(/window=30d/);
    await expect
      .poll(() => log.requests.some((url) => url.searchParams.get('window') === '30d'))
      .toBe(true);
  });

  test('should page through older fills', async ({ page }) => {
    const log = await mockApi(page);
    await page.goto(`/wallet/${WHALE}?tab=fills`);

    await page.getByRole('button', { name: 'Load older fills' }).click();

    await expect
      .poll(() =>
        log.requests.some(
          (url) => url.pathname.endsWith('/fills') && url.searchParams.has('before'),
        ),
      )
      .toBe(true);
    await expect(page.getByRole('button', { name: 'Load older fills' })).toBeHidden();
  });

  test('should show the live badge once the socket connects', async ({ page }) => {
    await mockApi(page);
    await mockLiveSocket(page, [{ type: 'status', status: 'connected' }]);
    await page.goto(`/wallet/${WHALE}`);

    await expect(page.getByText('Live', { exact: true })).toBeVisible();
  });

  test('should fall back to polling when live updates are at capacity', async ({ page }) => {
    await mockApi(page);
    await mockLiveSocket(page, [
      { type: 'error', error: { code: 'LIVE_CAPACITY', message: 'full' } },
    ]);
    await page.goto(`/wallet/${WHALE}`);

    await expect(page.getByText('Polling', { exact: true })).toBeVisible();
  });

  test('should explain an invalid address without calling the API', async ({ page }) => {
    const log = await mockApi(page);
    await page.goto('/wallet/0x123');

    await expect(page.getByText('That isn’t a wallet address')).toBeVisible();
    expect(log.requests.filter((url) => url.pathname.includes('0x123'))).toHaveLength(0);
  });
});
