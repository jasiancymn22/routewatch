import { TrafficEntry } from './types';
import { RoutePattern, groupByPattern } from './matcher';

export interface RouteScore {
  key: string;
  pattern: string;
  method: string;
  count: number;
  errorRate: number;
  avgDurationMs: number;
  score: number;
}

const ERROR_WEIGHT = 0.4;
const FREQUENCY_WEIGHT = 0.4;
const LATENCY_WEIGHT = 0.2;
const HIGH_LATENCY_THRESHOLD_MS = 500;

export function scoreRoute(
  key: string,
  pattern: RoutePattern,
  entries: TrafficEntry[],
  totalEntries: number
): RouteScore {
  const count = entries.length;
  const errors = entries.filter((e) => e.statusCode >= 400).length;
  const errorRate = count > 0 ? errors / count : 0;
  const avgDurationMs =
    count > 0 ? entries.reduce((s, e) => s + (e.durationMs ?? 0), 0) / count : 0;
  const frequencyScore = totalEntries > 0 ? count / totalEntries : 0;
  const latencyScore = Math.min(avgDurationMs / HIGH_LATENCY_THRESHOLD_MS, 1);
  const score =
    errorRate * ERROR_WEIGHT +
    frequencyScore * FREQUENCY_WEIGHT +
    latencyScore * LATENCY_WEIGHT;
  return {
    key,
    pattern: pattern.pattern,
    method: pattern.method,
    count,
    errorRate,
    avgDurationMs,
    score,
  };
}

export function scoreRoutes(
  entries: TrafficEntry[],
  patterns: RoutePattern[]
): RouteScore[] {
  const groups = groupByPattern(entries, patterns);
  const total = entries.length;
  const scores: RouteScore[] = [];
  for (const pattern of patterns) {
    const key = `${pattern.method} ${pattern.pattern}`;
    const bucket = groups.get(key) ?? [];
    scores.push(scoreRoute(key, pattern, bucket, total));
  }
  return scores.sort((a, b) => b.score - a.score);
}
