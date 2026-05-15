import { TrafficEntry } from './types';

export interface RateWindow {
  windowMs: number;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

export interface RouteRateMap {
  [routeKey: string]: RateWindow;
}

export function routeRateKey(entry: TrafficEntry): string {
  return `${entry.method}:${entry.path}`;
}

export function createRateWindow(entry: TrafficEntry, windowMs: number): RateWindow {
  return {
    windowMs,
    count: 1,
    firstSeen: entry.timestamp,
    lastSeen: entry.timestamp,
  };
}

export function updateRateWindow(window: RateWindow, entry: TrafficEntry): RateWindow {
  const isWithinWindow = entry.timestamp - window.firstSeen <= window.windowMs;
  if (isWithinWindow) {
    return { ...window, count: window.count + 1, lastSeen: entry.timestamp };
  }
  return {
    ...window,
    count: 1,
    firstSeen: entry.timestamp,
    lastSeen: entry.timestamp,
  };
}

export function computeRateMap(
  entries: TrafficEntry[],
  windowMs = 60_000
): RouteRateMap {
  const map: RouteRateMap = {};
  for (const entry of entries) {
    const key = routeRateKey(entry);
    if (!map[key]) {
      map[key] = createRateWindow(entry, windowMs);
    } else {
      map[key] = updateRateWindow(map[key], entry);
    }
  }
  return map;
}

export function getRequestRate(window: RateWindow): number {
  const elapsedMs = Math.max(window.lastSeen - window.firstSeen, 1);
  return (window.count / elapsedMs) * 1000; // requests per second
}

export function hotRoutes(
  rateMap: RouteRateMap,
  topN = 5
): Array<{ route: string; rps: number }> {
  return Object.entries(rateMap)
    .map(([route, window]) => ({ route, rps: getRequestRate(window) }))
    .sort((a, b) => b.rps - a.rps)
    .slice(0, topN);
}
