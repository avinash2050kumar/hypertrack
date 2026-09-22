import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MAX_LABEL_LENGTH, WATCHLIST_STORAGE_KEY } from '../data';

export interface WatchedWallet {
  address: string;
  label: string;
  addedAt: number;
}

type AddResult = 'added' | 'duplicate';

interface WatchlistState {
  wallets: WatchedWallet[];
  add: (address: string, label?: string) => AddResult;
  remove: (address: string) => { wallet: WatchedWallet; index: number } | null;
  restore: (wallet: WatchedWallet, index: number) => void;
  rename: (address: string, label: string) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      wallets: [],
      add: (address, label = '') => {
        if (get().wallets.some((wallet) => wallet.address === address)) return 'duplicate';
        set((state) => ({ wallets: [...state.wallets, { address, label, addedAt: Date.now() }] }));
        return 'added';
      },
      remove: (address) => {
        const index = get().wallets.findIndex((wallet) => wallet.address === address);
        const wallet = get().wallets[index];
        if (!wallet) return null;
        set((state) => ({ wallets: state.wallets.filter((entry) => entry.address !== address) }));
        return { wallet, index };
      },
      restore: (wallet, index) =>
        set((state) => {
          if (state.wallets.some((entry) => entry.address === wallet.address)) return state;
          const wallets = [...state.wallets];
          wallets.splice(Math.min(index, wallets.length), 0, wallet);
          return { wallets };
        }),
      rename: (address, label) =>
        set((state) => ({
          wallets: state.wallets.map((wallet) =>
            wallet.address === address
              ? { ...wallet, label: label.trim().slice(0, MAX_LABEL_LENGTH) }
              : wallet,
          ),
        })),
    }),
    {
      name: WATCHLIST_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
