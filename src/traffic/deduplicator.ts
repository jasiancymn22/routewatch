import { TrafficEntry } from './types';

export interface DeduplicateOptions {
  windowMs?: number;
  maxSimilarEntries?: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_SIMILAR = 100;

/**
 * Generates a deduplication key for a traffic entry based on
 * method, path, and status code.
 */
export function entryKey(entry: TrafficEntry): string {
  return `${entry.method}:${entry.path}:${entry.statusCode}`;
}

/**
 * Groups entries by their deduplication key.
 */
export function groupByKey(
  entries: TrafficEntry[]
): Map<string, TrafficEntry[]> {
  const groups = new Map<string, TrafficEntry[]>();
  for (const entry of entries) {
    const key = entryKey(entry);
    const existing = groups.get(key) ?? [];
    existing.push(entry);
    groups.set(key, existing);
  }
  return groups;
}

/**
 * Deduplicates traffic entries by limiting the number of similar
 * entries within a time window and capping per-key counts.
 */
export function deduplicateEntries(
  entries: TrafficEntry[],
  options: DeduplicateOptions = {}
): TrafficEntry[] {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxSimilar = options.maxSimilarEntries ?? DEFAULT_MAX_SIMILAR;
  const now = Date.now();
  const cutoff = now - windowMs;

  const recent = entries.filter(
    (e) => new Date(e.timestamp).getTime() >= cutoff
  );

  const groups = groupByKey(recent);
  const result: TrafficEntry[] = [];

  for (const [, group] of groups) {
    const sorted = group
      .slice()
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    result.push(...sorted.slice(0, maxSimilar));
  }

  return result;
}

/**
 * Returns only the most recent entry per unique key.
 */
export function pickLatestPerKey(
  entries: TrafficEntry[]
): TrafficEntry[] {
  const groups = groupByKey(entries);
  return Array.from(groups.values()).map((group) =>
    group.reduce((latest, e) =>
      new Date(e.timestamp).getTime() >
      new Date(latest.timestamp).getTime()
        ? e
        : latest
    )
  );
}
