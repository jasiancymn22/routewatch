import { TrafficEntry } from './types';

export interface CacheEntry {
  key: string;
  entry: TrafficEntry;
  expiresAt: number;
}

export interface CacheStore {
  entries: Map<string, CacheEntry>;
  ttlMs: number;
  maxSize: number;
}

export function createCacheStore(ttlMs = 60_000, maxSize = 500): CacheStore {
  return { entries: new Map(), ttlMs, maxSize };
}

export function cacheKey(entry: TrafficEntry): string {
  return `${entry.method}:${entry.path}:${entry.statusCode}`;
}

export function setCacheEntry(store: CacheStore, entry: TrafficEntry): void {
  const key = cacheKey(entry);
  if (store.entries.size >= store.maxSize) {
    const oldest = [...store.entries.entries()].sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt
    )[0];
    if (oldest) store.entries.delete(oldest[0]);
  }
  store.entries.set(key, {
    key,
    entry,
    expiresAt: Date.now() + store.ttlMs,
  });
}

export function getCacheEntry(
  store: CacheStore,
  entry: TrafficEntry
): TrafficEntry | null {
  const key = cacheKey(entry);
  const cached = store.entries.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    store.entries.delete(key);
    return null;
  }
  return cached.entry;
}

export function evictExpired(store: CacheStore): number {
  const now = Date.now();
  let count = 0;
  for (const [key, val] of store.entries) {
    if (now > val.expiresAt) {
      store.entries.delete(key);
      count++;
    }
  }
  return count;
}

export function getCacheSize(store: CacheStore): number {
  return store.entries.size;
}

export function clearCache(store: CacheStore): void {
  store.entries.clear();
}
