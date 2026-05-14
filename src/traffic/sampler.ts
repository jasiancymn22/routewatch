import { TrafficEntry } from './types';

export interface SamplerOptions {
  /** Max number of entries to keep per route+method combination */
  maxPerRoute?: number;
  /** Sample rate between 0 and 1 (e.g. 0.5 = 50% of requests) */
  sampleRate?: number;
  /** Optional seed for deterministic sampling in tests */
  random?: () => number;
}

const DEFAULT_MAX_PER_ROUTE = 100;
const DEFAULT_SAMPLE_RATE = 1.0;

/**
 * Determines whether a given request should be sampled based on the sample rate.
 */
export function shouldSample(options: SamplerOptions = {}): boolean {
  const rate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const rand = options.random ?? Math.random;
  return rand() < rate;
}

/**
 * Caps entries per route+method key to maxPerRoute, keeping the most recent.
 */
export function applyMaxPerRoute(
  entries: TrafficEntry[],
  maxPerRoute: number = DEFAULT_MAX_PER_ROUTE
): TrafficEntry[] {
  const buckets = new Map<string, TrafficEntry[]>();

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(entry);
  }

  const result: TrafficEntry[] = [];
  for (const [, bucket] of buckets) {
    const kept = bucket.slice(-maxPerRoute);
    result.push(...kept);
  }
  return result;
}

/**
 * Applies sampling options to a list of entries.
 * Filters by sample rate then caps per-route counts.
 */
export function sampleEntries(
  entries: TrafficEntry[],
  options: SamplerOptions = {}
): TrafficEntry[] {
  const rate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const rand = options.random ?? Math.random;
  const maxPerRoute = options.maxPerRoute ?? DEFAULT_MAX_PER_ROUTE;

  const sampled =
    rate >= 1.0 ? entries : entries.filter(() => rand() < rate);

  return applyMaxPerRoute(sampled, maxPerRoute);
}
