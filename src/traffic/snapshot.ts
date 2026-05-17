import { TrafficEntry } from './types';

export interface SnapshotMeta {
  capturedAt: number;
  entryCount: number;
  routes: string[];
}

export interface TrafficSnapshot {
  meta: SnapshotMeta;
  entries: TrafficEntry[];
}

export function createSnapshot(entries: TrafficEntry[]): TrafficSnapshot {
  const routes = [...new Set(entries.map((e) => `${e.method}:${e.path}`))];
  return {
    meta: {
      capturedAt: Date.now(),
      entryCount: entries.length,
      routes,
    },
    entries,
  };
}

export function mergeSnapshots(
  a: TrafficSnapshot,
  b: TrafficSnapshot
): TrafficSnapshot {
  const combined = [...a.entries, ...b.entries];
  return createSnapshot(combined);
}

export function filterSnapshotByRoute(
  snapshot: TrafficSnapshot,
  route: string
): TrafficSnapshot {
  const filtered = snapshot.entries.filter(
    (e) => `${e.method}:${e.path}` === route
  );
  return createSnapshot(filtered);
}

export function snapshotSince(
  snapshot: TrafficSnapshot,
  since: number
): TrafficSnapshot {
  const filtered = snapshot.entries.filter((e) => e.timestamp >= since);
  return createSnapshot(filtered);
}

export function summarizeSnapshot(snapshot: TrafficSnapshot): SnapshotMeta {
  return snapshot.meta;
}
