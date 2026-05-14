import { TrafficEntry } from './types';

export interface AggregatedRoute {
  method: string;
  path: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  statusCodes: Record<number, number>;
  avgResponseTime?: number;
}

export function aggregateEntries(
  entries: TrafficEntry[]
): AggregatedRoute[] {
  const map = new Map<string, AggregatedRoute>();

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        method: entry.method,
        path: entry.path,
        count: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        statusCodes: entry.statusCode
          ? { [entry.statusCode]: 1 }
          : {},
        avgResponseTime: entry.responseTime,
      });
    } else {
      existing.count += 1;
      existing.firstSeen = Math.min(existing.firstSeen, entry.timestamp);
      existing.lastSeen = Math.max(existing.lastSeen, entry.timestamp);

      if (entry.statusCode) {
        existing.statusCodes[entry.statusCode] =
          (existing.statusCodes[entry.statusCode] ?? 0) + 1;
      }

      if (entry.responseTime !== undefined) {
        const prev = existing.avgResponseTime ?? 0;
        existing.avgResponseTime =
          (prev * (existing.count - 1) + entry.responseTime) / existing.count;
      }
    }
  }

  return Array.from(map.values());
}

export function topRoutes(
  aggregated: AggregatedRoute[],
  limit: number = 10
): AggregatedRoute[] {
  return [...aggregated]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function routesSince(
  aggregated: AggregatedRoute[],
  since: number
): AggregatedRoute[] {
  return aggregated.filter((r) => r.lastSeen >= since);
}
