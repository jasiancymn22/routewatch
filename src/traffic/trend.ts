import { TrafficEntry } from './types';
import { bucketEntries } from './timeline';

export interface TrendPoint {
  timestamp: number;
  count: number;
  errorRate: number;
  avgLatency: number;
}

export interface RouteTrend {
  route: string;
  method: string;
  points: TrendPoint[];
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
}

export function computeTrendPoint(entries: TrafficEntry[]): TrendPoint {
  if (entries.length === 0) {
    return { timestamp: Date.now(), count: 0, errorRate: 0, avgLatency: 0 };
  }
  const errors = entries.filter(e => e.statusCode >= 400).length;
  const totalLatency = entries.reduce((sum, e) => sum + (e.durationMs ?? 0), 0);
  return {
    timestamp: entries[0].timestamp,
    count: entries.length,
    errorRate: errors / entries.length,
    avgLatency: totalLatency / entries.length,
  };
}

export function buildTrend(entries: TrafficEntry[], bucketMs = 60_000): RouteTrend[] {
  const byRoute = new Map<string, TrafficEntry[]>();
  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!byRoute.has(key)) byRoute.set(key, []);
    byRoute.get(key)!.push(entry);
  }

  const trends: RouteTrend[] = [];
  for (const [key, routeEntries] of byRoute) {
    const [method, route] = key.split(':');
    const buckets = bucketEntries(routeEntries, bucketMs);
    const points = buckets.map(b => computeTrendPoint(b.entries));
    const direction = detectDirection(points);
    const changePercent = computeChangePercent(points);
    trends.push({ route, method, points, direction, changePercent });
  }
  return trends;
}

export function detectDirection(points: TrendPoint[]): 'up' | 'down' | 'stable' {
  if (points.length < 2) return 'stable';
  const first = points[0].count;
  const last = points[points.length - 1].count;
  const pct = first === 0 ? 0 : (last - first) / first;
  if (pct > 0.1) return 'up';
  if (pct < -0.1) return 'down';
  return 'stable';
}

export function computeChangePercent(points: TrendPoint[]): number {
  if (points.length < 2) return 0;
  const first = points[0].count;
  const last = points[points.length - 1].count;
  if (first === 0) return last > 0 ? 100 : 0;
  return Math.round(((last - first) / first) * 100);
}
