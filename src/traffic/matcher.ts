import { TrafficEntry } from './types';

export interface RoutePattern {
  method: string;
  pattern: string;
  regex: RegExp;
}

export function buildRoutePattern(method: string, pattern: string): RoutePattern {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)')
    .replace(/\*/g, '.*');
  return {
    method: method.toUpperCase(),
    pattern,
    regex: new RegExp(`^${escaped}$`),
  };
}

export function matchEntry(entry: TrafficEntry, routePattern: RoutePattern): boolean {
  if (entry.method.toUpperCase() !== routePattern.method) return false;
  return routePattern.regex.test(entry.path);
}

export function findMatchingPattern(
  entry: TrafficEntry,
  patterns: RoutePattern[]
): RoutePattern | undefined {
  return patterns.find((p) => matchEntry(entry, p));
}

export function filterByPattern(
  entries: TrafficEntry[],
  patterns: RoutePattern[]
): TrafficEntry[] {
  return entries.filter((e) => findMatchingPattern(e, patterns) !== undefined);
}

export function groupByPattern(
  entries: TrafficEntry[],
  patterns: RoutePattern[]
): Map<string, TrafficEntry[]> {
  const result = new Map<string, TrafficEntry[]>();
  for (const entry of entries) {
    const match = findMatchingPattern(entry, patterns);
    const key = match ? `${match.method} ${match.pattern}` : '__unmatched__';
    const bucket = result.get(key) ?? [];
    bucket.push(entry);
    result.set(key, bucket);
  }
  return result;
}
