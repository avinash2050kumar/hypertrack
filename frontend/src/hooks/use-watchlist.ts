import { useWatchlistStore } from '../store';

export function useWatchlist() {
  const wallets = useWatchlistStore((state) => state.wallets);
  const add = useWatchlistStore((state) => state.add);
  const remove = useWatchlistStore((state) => state.remove);
  const restore = useWatchlistStore((state) => state.restore);
  const rename = useWatchlistStore((state) => state.rename);
  return { wallets, add, remove, restore, rename };
}

export function useWalletLabel(address: string): string {
  return useWatchlistStore(
    (state) => state.wallets.find((wallet) => wallet.address === address)?.label ?? '',
  );
}
