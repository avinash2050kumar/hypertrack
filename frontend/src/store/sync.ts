import { WATCHLIST_STORAGE_KEY } from '../data';
import { useWatchlistStore } from './watchlist';

// Other tabs write to localStorage; rehydrating on the storage event keeps every tab in sync.
// Theme mode syncs itself: MUI's colour-scheme manager listens to the same event.
export function syncStoresAcrossTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === WATCHLIST_STORAGE_KEY) void useWatchlistStore.persist.rehydrate();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
