/**
 * Throttler: rate-limits traffic recording per route+method
 * to prevent high-traffic routes from overwhelming the store.
 */

export interface ThrottleOptions {
  windowMs: number;   // time window in milliseconds
  maxPerWindow: number; // max entries per route+method per window
}

const DEFAULT_OPTIONS: ThrottleOptions = {
  windowMs: 60_000,
  maxPerWindow: 100,
};

interface BucketEntry {
  count: number;
  windowStart: number;
}

export type ThrottleStore = Map<string, BucketEntry>;

export function createThrottleStore(): ThrottleStore {
  return new Map();
}

export function throttleKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`;
}

export function shouldThrottle(
  store: ThrottleStore,
  method: string,
  path: string,
  now: number = Date.now(),
  options: ThrottleOptions = DEFAULT_OPTIONS
): boolean {
  const key = throttleKey(method, path);
  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStart >= options.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return false;
  }

  if (bucket.count >= options.maxPerWindow) {
    return true;
  }

  bucket.count += 1;
  return false;
}

export function resetThrottleStore(store: ThrottleStore): void {
  store.clear();
}

export function getThrottleCounts(
  store: ThrottleStore
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, bucket] of store.entries()) {
    result[key] = bucket.count;
  }
  return result;
}
