import { TrafficEntry } from './types';
import { ClassifiedEntry, classifyEntries, groupByCategory } from './classifier';

export interface RouteStats {
  path: string;
  method: string;
  count: number;
  errorCount: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  statusCodes: Record<number, number>;
}

export interface TrafficStats {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgDurationMs: number;
  categoryCounts: Record<string, number>;
  authenticatedCount: number;
  routes: RouteStats[];
}

export function computeRouteStats(entries: TrafficEntry[]): RouteStats[] {
  const map = new Map<string, TrafficEntry[]>();
  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }

  return Array.from(map.entries()).map(([key, group]) => {
    const [method, path] = key.split(/:(.+)/);
    const durations = group.map((e) => e.durationMs ?? 0);
    const statusCodes: Record<number, number> = {};
    for (const e of group) {
      statusCodes[e.statusCode] = (statusCodes[e.statusCode] ?? 0) + 1;
    }
    return {
      path,
      method,
      count: group.length,
      errorCount: group.filter((e) => e.statusCode >= 400).length,
      avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDurationMs: Math.min(...durations),
      maxDurationMs: Math.max(...durations),
      statusCodes,
    };
  });
}

export function computeTrafficStats(entries: TrafficEntry[]): TrafficStats {
  const classified: ClassifiedEntry[] = classifyEntries(entries);
  const groups = groupByCategory(classified);
  const totalRequests = entries.length;
  const totalErrors = entries.filter((e) => e.statusCode >= 400).length;
  const durations = entries.map((e) => e.durationMs ?? 0);
  const avgDurationMs =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    totalRequests,
    totalErrors,
    errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
    avgDurationMs,
    categoryCounts: {
      read: groups.read.length,
      write: groups.write.length,
      delete: groups.delete.length,
      other: groups.other.length,
    },
    authenticatedCount: classified.filter((c) => c.isAuthenticated).length,
    routes: computeRouteStats(entries),
  };
}
