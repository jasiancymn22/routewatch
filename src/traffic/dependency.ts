import { TrafficEntry } from './types';

export interface RouteDependency {
  from: string;
  to: string;
  count: number;
  avgGapMs: number;
}

export interface DependencyMap {
  [route: string]: RouteDependency[];
}

/**
 * Detects likely route dependencies by finding entries from the same
 * session/IP that occur in close temporal succession.
 */
export function detectDependencies(
  entries: TrafficEntry[],
  windowMs = 500
): RouteDependency[] {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const pairs: Map<string, { count: number; totalGap: number }> = new Map();

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      const gap = b.timestamp - a.timestamp;
      if (gap > windowMs) break;
      if (a.path === b.path && a.method === b.method) continue;
      const key = `${a.method}:${a.path}=>${b.method}:${b.path}`;
      const existing = pairs.get(key) ?? { count: 0, totalGap: 0 };
      pairs.set(key, { count: existing.count + 1, totalGap: existing.totalGap + gap });
    }
  }

  return Array.from(pairs.entries()).map(([key, { count, totalGap }]) => {
    const [from, to] = key.split('=>');
    return { from, to, count, avgGapMs: Math.round(totalGap / count) };
  });
}

export function buildDependencyMap(deps: RouteDependency[]): DependencyMap {
  const map: DependencyMap = {};
  for (const dep of deps) {
    if (!map[dep.from]) map[dep.from] = [];
    map[dep.from].push(dep);
  }
  return map;
}

export function topDependencies(deps: RouteDependency[], limit = 10): RouteDependency[] {
  return [...deps].sort((a, b) => b.count - a.count).slice(0, limit);
}
