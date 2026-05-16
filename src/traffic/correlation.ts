import { TrafficEntry } from './types';

export interface CorrelationPair {
  routeA: string;
  routeB: string;
  coOccurrences: number;
  correlationScore: number;
}

export interface CorrelationMap {
  pairs: CorrelationPair[];
  sessionCount: number;
}

/** Group entries into sessions by IP + time window (default 5 minutes) */
export function groupIntoSessions(
  entries: TrafficEntry[],
  windowMs: number = 5 * 60 * 1000
): TrafficEntry[][] {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const sessions: TrafficEntry[][] = [];
  let current: TrafficEntry[] = [];
  let windowStart = 0;

  for (const entry of sorted) {
    if (current.length === 0) {
      windowStart = entry.timestamp;
      current.push(entry);
    } else if (entry.timestamp - windowStart <= windowMs) {
      current.push(entry);
    } else {
      sessions.push(current);
      current = [entry];
      windowStart = entry.timestamp;
    }
  }
  if (current.length > 0) sessions.push(current);
  return sessions;
}

/** Count how often each pair of routes appears in the same session */
export function countCoOccurrences(
  sessions: TrafficEntry[][]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const routes = [...new Set(session.map((e) => `${e.method}:${e.path}`))];
    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        const key = [routes[i], routes[j]].sort().join('||');
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** Build correlation map from traffic entries */
export function buildCorrelationMap(
  entries: TrafficEntry[],
  windowMs?: number,
  minScore: number = 0.1
): CorrelationMap {
  const sessions = groupIntoSessions(entries, windowMs);
  const coOccurrences = countCoOccurrences(sessions);
  const sessionCount = sessions.length;
  const pairs: CorrelationPair[] = [];

  for (const [key, count] of coOccurrences.entries()) {
    const [routeA, routeB] = key.split('||');
    const score = sessionCount > 0 ? count / sessionCount : 0;
    if (score >= minScore) {
      pairs.push({ routeA, routeB, coOccurrences: count, correlationScore: parseFloat(score.toFixed(4)) });
    }
  }

  pairs.sort((a, b) => b.correlationScore - a.correlationScore);
  return { pairs, sessionCount };
}

/** Get top correlated routes for a given route key */
export function getCorrelatedRoutes(
  route: string,
  map: CorrelationMap,
  topN: number = 5
): CorrelationPair[] {
  return map.pairs
    .filter((p) => p.routeA === route || p.routeB === route)
    .slice(0, topN);
}
