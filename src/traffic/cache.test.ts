import {
  createCacheStore,
  setCacheEntry,
  getCacheEntry,
  evictExpired,
  getCacheSize,
  clearCache,
  cacheKey,
} from './cache';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: null,
    responseBody: null,
    timestamp: Date.now(),
    durationMs: 42,
    ...overrides,
  };
}

describe('cacheKey', () => {
  it('generates a key from method, path, and status', () => {
    const entry = makeEntry();
    expect(cacheKey(entry)).toBe('GET:/api/test:200');
  });
});

describe('setCacheEntry / getCacheEntry', () => {
  it('stores and retrieves an entry', () => {
    const store = createCacheStore();
    const entry = makeEntry();
    setCacheEntry(store, entry);
    expect(getCacheEntry(store, entry)).toEqual(entry);
  });

  it('returns null for missing entry', () => {
    const store = createCacheStore();
    expect(getCacheEntry(store, makeEntry())).toBeNull();
  });

  it('returns null for expired entry', () => {
    const store = createCacheStore(1);
    const entry = makeEntry();
    setCacheEntry(store, entry);
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(getCacheEntry(store, entry)).toBeNull();
        resolve();
      }, 10)
    );
  });

  it('evicts oldest entry when maxSize is reached', () => {
    const store = createCacheStore(60_000, 2);
    const e1 = makeEntry({ path: '/a' });
    const e2 = makeEntry({ path: '/b' });
    const e3 = makeEntry({ path: '/c' });
    setCacheEntry(store, e1);
    setCacheEntry(store, e2);
    setCacheEntry(store, e3);
    expect(getCacheSize(store)).toBe(2);
  });
});

describe('evictExpired', () => {
  it('removes expired entries and returns count', async () => {
    const store = createCacheStore(1);
    setCacheEntry(store, makeEntry({ path: '/x' }));
    setCacheEntry(store, makeEntry({ path: '/y' }));
    await new Promise((r) => setTimeout(r, 10));
    const removed = evictExpired(store);
    expect(removed).toBe(2);
    expect(getCacheSize(store)).toBe(0);
  });
});

describe('clearCache', () => {
  it('removes all entries', () => {
    const store = createCacheStore();
    setCacheEntry(store, makeEntry({ path: '/a' }));
    setCacheEntry(store, makeEntry({ path: '/b' }));
    clearCache(store);
    expect(getCacheSize(store)).toBe(0);
  });
});
