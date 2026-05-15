import { TrafficEntry } from './types';

export interface RouteProfile {
  method: string;
  path: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  sampleCount: number;
}

export interface TrafficProfile {
  routes: RouteProfile[];
  totalRequests: number;
  generatedAt: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function profileRoute(
  method: string,
  path: string,
  entries: TrafficEntry[]
): RouteProfile {
  const durations = entries
    .map((e) => e.duration ?? 0)
    .sort((a, b) => a - b);

  const sum = durations.reduce((a, b) => a + b, 0);
  const count = durations.length;

  return {
    method,
    path,
    avgDuration: count > 0 ? sum / count : 0,
    minDuration: durations[0] ?? 0,
    maxDuration: durations[count - 1] ?? 0,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    sampleCount: count,
  };
}

export function profileEntries(entries: TrafficEntry[]): TrafficProfile {
  const grouped = new Map<string, TrafficEntry[]>();

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const routes: RouteProfile[] = [];
  for (const [key, group] of grouped.entries()) {
    const [method, path] = key.split(':');
    routes.push(profileRoute(method, path, group));
  }

  return {
    routes,
    totalRequests: entries.length,
    generatedAt: Date.now(),
  };
}
