import { TrafficEntry } from './types';

export interface LatencyBucket {
  route: string;
  method: string;
  p50: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  count: number;
}

export interface LatencyReport {
  buckets: LatencyBucket[];
  generatedAt: number;
}

function sortedLatencies(entries: TrafficEntry[]): number[] {
  return entries
    .map((e) => e.durationMs ?? 0)
    .sort((a, b) => a - b);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeLatencyBucket(
  route: string,
  method: string,
  entries: TrafficEntry[]
): LatencyBucket {
  const sorted = sortedLatencies(entries);
  return {
    route,
    method,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p99: percentile(sorted, 99),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: Math.round(mean(sorted)),
    count: sorted.length,
  };
}

export function buildLatencyReport(entries: TrafficEntry[]): LatencyReport {
  const grouped = new Map<string, TrafficEntry[]>();

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const buckets: LatencyBucket[] = [];
  for (const [key, group] of grouped.entries()) {
    const [method, route] = key.split(':');
    buckets.push(computeLatencyBucket(route, method, group));
  }

  return { buckets, generatedAt: Date.now() };
}
