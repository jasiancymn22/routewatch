import { TrafficEntry } from './types';
import { profileRoute } from './profiler';

export interface OutlierResult {
  entry: TrafficEntry;
  reason: string;
  zScore: number;
}

export function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

export function detectLatencyOutliers(
  entries: TrafficEntry[],
  threshold = 2.5
): OutlierResult[] {
  if (entries.length < 3) return [];

  const durations = entries.map((e) => e.durationMs);
  const mean = computeMean(durations);
  const stdDev = computeStdDev(durations, mean);

  return entries
    .map((entry) => ({
      entry,
      reason: 'latency',
      zScore: zScore(entry.durationMs, mean, stdDev),
    }))
    .filter((r) => Math.abs(r.zScore) >= threshold);
}

export function detectOutliersByRoute(
  entries: TrafficEntry[],
  threshold = 2.5
): Map<string, OutlierResult[]> {
  const byRoute = new Map<string, TrafficEntry[]>();

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!byRoute.has(key)) byRoute.set(key, []);
    byRoute.get(key)!.push(entry);
  }

  const result = new Map<string, OutlierResult[]>();
  for (const [key, routeEntries] of byRoute) {
    const outliers = detectLatencyOutliers(routeEntries, threshold);
    if (outliers.length > 0) result.set(key, outliers);
  }

  return result;
}

export function summarizeOutliers(outliers: OutlierResult[]): {
  count: number;
  maxZScore: number;
  avgZScore: number;
} {
  if (outliers.length === 0) return { count: 0, maxZScore: 0, avgZScore: 0 };
  const scores = outliers.map((o) => Math.abs(o.zScore));
  return {
    count: outliers.length,
    maxZScore: Math.max(...scores),
    avgZScore: computeMean(scores),
  };
}
