import { describe, expect, it, vi } from 'vitest';

import { TtlCache } from '../../src/services/cache.js';

describe('TtlCache', () => {
  it('should load on a miss and serve from cache on a hit', async () => {
    const cache = new TtlCache<{ n: number }>(1_000);
    const loader = vi.fn().mockResolvedValue({ n: 1 });

    const first = await cache.getOrLoad('key', loader);
    const second = await cache.getOrLoad('key', loader);

    expect(first).toMatchObject({ value: { n: 1 }, cached: false });
    expect(second).toMatchObject({ value: { n: 1 }, cached: true, asOf: first.asOf });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('should reload after the TTL expires', async () => {
    const cache = new TtlCache<{ n: number }>(20);
    const loader = vi.fn().mockResolvedValueOnce({ n: 1 }).mockResolvedValueOnce({ n: 2 });

    await cache.getOrLoad('key', loader);
    await new Promise((resolve) => setTimeout(resolve, 40));
    const result = await cache.getOrLoad('key', loader);

    expect(result).toMatchObject({ value: { n: 2 }, cached: false });
  });

  it('should share one in-flight load between concurrent callers', async () => {
    const cache = new TtlCache<{ n: number }>(1_000);
    const loader = vi.fn().mockResolvedValue({ n: 1 });

    const [a, b, c] = await Promise.all([
      cache.getOrLoad('key', loader),
      cache.getOrLoad('key', loader),
      cache.getOrLoad('key', loader),
    ]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect([a.cached, b.cached, c.cached]).toEqual([false, true, true]);
  });

  it('should never store values when the TTL is zero', async () => {
    const cache = new TtlCache<{ n: number }>(0);
    const loader = vi.fn().mockResolvedValue({ n: 1 });

    await cache.getOrLoad('key', loader);
    await cache.getOrLoad('key', loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('should not cache a failed load', async () => {
    const cache = new TtlCache<{ n: number }>(1_000);
    const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ n: 1 });

    await expect(cache.getOrLoad('key', loader)).rejects.toThrow('boom');
    await expect(cache.getOrLoad('key', loader)).resolves.toMatchObject({ value: { n: 1 } });
  });

  it('should evict the least recently used entry beyond capacity', async () => {
    const cache = new TtlCache<{ key: string }>(10_000, 2);
    const loader = (key: string) => vi.fn().mockResolvedValue({ key });

    await cache.getOrLoad('a', loader('a'));
    await cache.getOrLoad('b', loader('b'));
    await cache.getOrLoad('c', loader('c'));
    const reloadA = loader('a');
    await cache.getOrLoad('a', reloadA);

    expect(reloadA).toHaveBeenCalledTimes(1);
  });

  it('should drop everything on clear', async () => {
    const cache = new TtlCache<{ n: number }>(1_000);
    const loader = vi.fn().mockResolvedValue({ n: 1 });

    await cache.getOrLoad('key', loader);
    cache.clear();
    await cache.getOrLoad('key', loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
