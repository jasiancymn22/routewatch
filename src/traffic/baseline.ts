import { TrafficEntry } from './types';

export interface BaselineStats {
  route: string;
  method: string;
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  requestCount: number;
  capturedAt: number;
}

export interface BaselineSnapshot {
  createdAt: number;
  routes: Record<string, BaselineStats>;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function computeBaseline(entries: TrafficEntry[]): BaselineSnapshot {
  const groups: Record<string, TrafficEntry[]> = {};

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }

  const routes: Record<string, BaselineStats> = {};

  for (const [key, group] of Object.entries(groups)) {
    const [method, route] = key.split(/:(.+)/);
    const latencies = group
      .map((e) => e.durationMs ?? 0)
      .sort((a, b) => a - b);
    const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
    const errors = group.filter((e) => e.statusCode >= 400).length;

    routes[key] = {
      route,
      method,
      avgLatency: Math.round(avg),
      p95Latency: percentile(latencies, 95),
      errorRate: errors / group.length,
      requestCount: group.length,
      capturedAt: Date.now(),
    };
  }

  return { createdAt: Date.now(), routes };
}

export function compareToBaseline(
  current: BaselineStats,
  baseline: BaselineStats,
  thresholds = { latencyFactor: 1.5, errorRateDelta: 0.1 }
): { latencyRegressed: boolean; errorRateRegressed: boolean } {
  return {
    latencyRegressed:
      current.avgLatency > baseline.avgLatency * thresholds.latencyFactor,
    errorRateRegressed:
      current.errorRate - baseline.errorRate > thresholds.errorRateDelta,
  };
}
