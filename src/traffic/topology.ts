import { TrafficEntry } from "./types";

export interface RouteNode {
  path: string;
  method: string;
  callCount: number;
  avgLatency: number;
}

export interface RouteEdge {
  from: string;
  to: string;
  weight: number;
}

export interface RouteTopology {
  nodes: RouteNode[];
  edges: RouteEdge[];
}

export function buildRouteNodes(entries: TrafficEntry[]): RouteNode[] {
  const map = new Map<string, { count: number; totalLatency: number }>();

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    const existing = map.get(key) ?? { count: 0, totalLatency: 0 };
    map.set(key, {
      count: existing.count + 1,
      totalLatency: existing.totalLatency + (entry.durationMs ?? 0),
    });
  }

  return Array.from(map.entries()).map(([key, val]) => {
    const [method, path] = key.split(":");
    return {
      path,
      method,
      callCount: val.count,
      avgLatency: val.count > 0 ? val.totalLatency / val.count : 0,
    };
  });
}

export function buildRouteEdges(
  entries: TrafficEntry[],
  windowMs = 5000
): RouteEdge[] {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const edgeMap = new Map<string, number>();

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    if (next.timestamp - curr.timestamp <= windowMs) {
      const from = `${curr.method}:${curr.path}`;
      const to = `${next.method}:${next.path}`;
      if (from !== to) {
        const key = `${from}->${to}`;
        edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(edgeMap.entries()).map(([key, weight]) => {
    const [from, to] = key.split("->");
    return { from, to, weight };
  });
}

export function buildTopology(
  entries: TrafficEntry[],
  windowMs = 5000
): RouteTopology {
  return {
    nodes: buildRouteNodes(entries),
    edges: buildRouteEdges(entries, windowMs),
  };
}
