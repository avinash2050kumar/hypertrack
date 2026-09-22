import { beforeEach, describe, expect, it } from 'vitest';

import { useWatchlistStore } from '../../src/store';
import { ADDRESS, OTHER_ADDRESS } from '../utils/fixtures';

const THIRD = '0x0000000000000000000000000000000000000003';
const store = () => useWatchlistStore.getState();
const addresses = () => store().wallets.map((wallet) => wallet.address);

describe('watchlist store', () => {
  beforeEach(() => {
    useWatchlistStore.setState({ wallets: [] });
  });

  it('should add a wallet with its label and timestamp', () => {
    expect(store().add(ADDRESS, 'Whale')).toBe('added');

    expect(store().wallets).toEqual([
      { address: ADDRESS, label: 'Whale', addedAt: expect.any(Number) },
    ]);
  });

  it('should refuse to add the same wallet twice', () => {
    store().add(ADDRESS);

    expect(store().add(ADDRESS, 'Again')).toBe('duplicate');
    expect(store().wallets).toHaveLength(1);
  });

  it('should keep wallets in the order they were added', () => {
    store().add(ADDRESS);
    store().add(OTHER_ADDRESS);
    store().add(THIRD);

    expect(addresses()).toEqual([ADDRESS, OTHER_ADDRESS, THIRD]);
  });

  it('should return the removed wallet and its position', () => {
    store().add(ADDRESS);
    store().add(OTHER_ADDRESS, 'Second');

    const removed = store().remove(OTHER_ADDRESS);

    expect(removed).toEqual({ wallet: expect.objectContaining({ label: 'Second' }), index: 1 });
    expect(addresses()).toEqual([ADDRESS]);
  });

  it('should return null when removing a wallet that is not tracked', () => {
    expect(store().remove(ADDRESS)).toBeNull();
  });

  it('should restore a removed wallet to its original position', () => {
    store().add(ADDRESS);
    store().add(OTHER_ADDRESS);
    store().add(THIRD);
    const removed = store().remove(OTHER_ADDRESS);

    if (removed) store().restore(removed.wallet, removed.index);

    expect(addresses()).toEqual([ADDRESS, OTHER_ADDRESS, THIRD]);
  });

  it('should append when the original position no longer exists', () => {
    store().add(ADDRESS);
    const removed = store().remove(ADDRESS);
    store().add(OTHER_ADDRESS);

    if (removed) store().restore(removed.wallet, 5);

    expect(addresses()).toEqual([OTHER_ADDRESS, ADDRESS]);
  });

  it('should not duplicate a wallet that was re-added before undo', () => {
    store().add(ADDRESS);
    const removed = store().remove(ADDRESS);
    store().add(ADDRESS);

    if (removed) store().restore(removed.wallet, removed.index);

    expect(addresses()).toEqual([ADDRESS]);
  });

  it('should trim labels and cap them at 40 characters', () => {
    store().add(ADDRESS);

    store().rename(ADDRESS, `   ${'x'.repeat(60)}   `);

    expect(store().wallets[0]?.label).toBe('x'.repeat(40));
  });

  it('should only rename the targeted wallet', () => {
    store().add(ADDRESS, 'One');
    store().add(OTHER_ADDRESS, 'Two');

    store().rename(OTHER_ADDRESS, 'Renamed');

    expect(store().wallets.map((wallet) => wallet.label)).toEqual(['One', 'Renamed']);
  });

  it('should persist the watchlist to localStorage', () => {
    store().add(ADDRESS, 'Whale');

    const saved = JSON.parse(localStorage.getItem('hypertrack:watchlist') ?? '{}');

    expect(saved).toMatchObject({
      version: 1,
      state: { wallets: [{ address: ADDRESS, label: 'Whale' }] },
    });
  });

  it('should rehydrate wallets saved by another tab', async () => {
    localStorage.setItem(
      'hypertrack:watchlist',
      JSON.stringify({
        state: { wallets: [{ address: OTHER_ADDRESS, label: 'Tab', addedAt: 1 }] },
        version: 1,
      }),
    );

    await useWatchlistStore.persist.rehydrate();

    expect(addresses()).toEqual([OTHER_ADDRESS]);
  });

  it('should survive corrupt saved data', async () => {
    localStorage.setItem('hypertrack:watchlist', '{not json');

    await expect(useWatchlistStore.persist.rehydrate()).resolves.not.toThrow();
    expect(Array.isArray(store().wallets)).toBe(true);
  });
});
