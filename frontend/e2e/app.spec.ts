import { expect, test } from '@playwright/test';

import { mockApi, seedWatchlist, WHALE } from './support/mock-api';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('should show a not found page for unknown routes', async ({ page }) => {
  await page.goto('/definitely-not-here');

  await expect(page.getByText('Page not found')).toBeVisible();
  await page.getByRole('link', { name: 'Back to watchlist' }).click();
  await expect(page).toHaveURL('/');
});

test('should navigate between sections from the header', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Compare', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compare wallets' })).toBeVisible();

  await page.getByRole('link', { name: 'Watchlist', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Watchlist', exact: true })).toBeVisible();
});

test('should remember the chosen theme across reloads', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.reload();

  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
});

test('should show an empty comparison without addresses', async ({ page }) => {
  await page.goto('/compare');

  await expect(page.getByText('Nothing to compare yet')).toBeVisible();
});

test('should compare at most four unique wallets from the URL', async ({ page }) => {
  const addresses = [1, 2, 3, 4, 5].map((n) => `0x${String(n).padStart(40, '0')}`);
  await page.goto(`/compare?addresses=${[addresses[0], ...addresses].join(',')}`);

  await expect(page.getByRole('button', { name: /from comparison/ })).toHaveCount(4);
});

test('@responsive should fit small screens without horizontal scrolling', async ({ page }) => {
  await seedWatchlist(page, [{ address: WHALE, label: 'Whale' }]);

  for (const path of ['/', `/wallet/${WHALE}`, `/compare?addresses=${WHALE}`]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test('@responsive should load the dashboard quickly', async ({ page }) => {
  await seedWatchlist(page, [{ address: WHALE, label: 'Whale' }]);
  await page.goto('/');
  await expect(page.getByText('Tracked value')).toBeVisible();

  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1]?.startTime ?? 0);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      }),
  );
  expect(lcp).toBeLessThan(4_000);
});
