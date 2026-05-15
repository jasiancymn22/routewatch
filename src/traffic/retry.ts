import { TrafficEntry } from './types';

export interface RetryGroup {
  key: string;
  method: string;
  path: string;
  entries: TrafficEntry[];
  retryCount: number;
  successAfterRetry: boolean;
}

export function retryKey(entry: TrafficEntry): string {
  return `${entry.method}:${entry.path}`;
}

export function groupRetries(
  entries: TrafficEntry[],
  windowMs = 5000
): RetryGroup[] {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const groups: Map<string, TrafficEntry[]> = new Map();

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const key = retryKey(entry);
    const window = sorted.filter(
      (e) =>
        retryKey(e) === key &&
        Math.abs(e.timestamp - entry.timestamp) <= windowMs
    );
    if (window.length > 1 && !groups.has(`${key}:${entry.timestamp}`)) {
      groups.set(`${key}:${entry.timestamp}`, window);
    }
  }

  return Array.from(groups.entries()).map(([compositeKey, grpEntries]) => {
    const [method, path] = compositeKey.split(':').slice(0, 2);
    const retryCount = grpEntries.length - 1;
    const successAfterRetry = grpEntries.some(
      (e, idx) => idx > 0 && e.statusCode >= 200 && e.statusCode < 300
    );
    return { key: `${method}:${path}`, method, path, entries: grpEntries, retryCount, successAfterRetry };
  });
}

export function detectRetries(
  entries: TrafficEntry[],
  windowMs = 5000
): TrafficEntry[] {
  const groups = groupRetries(entries, windowMs);
  const retryKeys = new Set(groups.map((g) => g.key));
  return entries.filter((e) => retryKeys.has(retryKey(e)));
}

export function retryStats(entries: TrafficEntry[], windowMs = 5000): Record<string, { retries: number; successRate: number }> {
  const groups = groupRetries(entries, windowMs);
  const stats: Record<string, { retries: number; successRate: number }> = {};
  for (const g of groups) {
    const successes = g.entries.filter((e) => e.statusCode >= 200 && e.statusCode < 300).length;
    stats[g.key] = {
      retries: g.retryCount,
      successRate: g.entries.length > 0 ? successes / g.entries.length : 0,
    };
  }
  return stats;
}
