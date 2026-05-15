import { TrafficEntry } from './types';

export interface TrafficDiff {
  added: TrafficEntry[];
  removed: TrafficEntry[];
  unchanged: TrafficEntry[];
}

export interface RouteDiff {
  addedRoutes: string[];
  removedRoutes: string[];
  commonRoutes: string[];
}

function entrySignature(entry: TrafficEntry): string {
  return `${entry.method}:${entry.path}`;
}

export function diffEntries(
  before: TrafficEntry[],
  after: TrafficEntry[]
): TrafficDiff {
  const beforeSigs = new Map<string, TrafficEntry>();
  for (const e of before) {
    beforeSigs.set(entrySignature(e), e);
  }

  const afterSigs = new Map<string, TrafficEntry>();
  for (const e of after) {
    afterSigs.set(entrySignature(e), e);
  }

  const added: TrafficEntry[] = [];
  const removed: TrafficEntry[] = [];
  const unchanged: TrafficEntry[] = [];

  for (const [sig, entry] of afterSigs) {
    if (beforeSigs.has(sig)) {
      unchanged.push(entry);
    } else {
      added.push(entry);
    }
  }

  for (const [sig, entry] of beforeSigs) {
    if (!afterSigs.has(sig)) {
      removed.push(entry);
    }
  }

  return { added, removed, unchanged };
}

export function diffRoutes(
  before: TrafficEntry[],
  after: TrafficEntry[]
): RouteDiff {
  const beforeRoutes = new Set(before.map(e => `${e.method}:${e.path}`));
  const afterRoutes = new Set(after.map(e => `${e.method}:${e.path}`));

  const addedRoutes = [...afterRoutes].filter(r => !beforeRoutes.has(r));
  const removedRoutes = [...beforeRoutes].filter(r => !afterRoutes.has(r));
  const commonRoutes = [...afterRoutes].filter(r => beforeRoutes.has(r));

  return { addedRoutes, removedRoutes, commonRoutes };
}

export function hasDrift(diff: RouteDiff): boolean {
  return diff.addedRoutes.length > 0 || diff.removedRoutes.length > 0;
}
