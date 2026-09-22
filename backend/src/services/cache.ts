import { LRUCache } from 'lru-cache';

import { CACHE_MAX_ENTRIES } from '../data/index.js';

export interface Cached<V> {
  value: V;
  cached: boolean;
  asOf: number;
}

interface Entry<V> {
  value: V;
  asOf: number;
}

export class TtlCache<V extends object> {
  private readonly store: LRUCache<string, Entry<V>>;
  private readonly inflight = new Map<string, Promise<Entry<V>>>();

  constructor(
    private readonly ttlMs: number,
    max = CACHE_MAX_ENTRIES,
  ) {
    this.store = new LRUCache<string, Entry<V>>({ max });
  }

  async getOrLoad(key: string, loader: () => Promise<V>): Promise<Cached<V>> {
    const hit = this.store.get(key);
    if (hit) return { ...hit, cached: true };

    const pending = this.inflight.get(key);
    if (pending) return { ...(await pending), cached: true };

    const promise = loader()
      .then((value) => {
        const entry = { value, asOf: Date.now() };
        if (this.ttlMs > 0) this.store.set(key, entry, { ttl: this.ttlMs });
        return entry;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return { ...(await promise), cached: false };
  }

  clear(): void {
    this.store.clear();
  }
}
