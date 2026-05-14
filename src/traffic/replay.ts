import { TrafficEntry } from './types';

export interface ReplayOptions {
  delayMs?: number;
  onEntry?: (entry: TrafficEntry) => void;
  filter?: (entry: TrafficEntry) => boolean;
}

export interface ReplayResult {
  replayed: number;
  skipped: number;
  durationMs: number;
}

export function sortEntriesByTime(entries: TrafficEntry[]): TrafficEntry[] {
  return [...entries].sort((a, b) => a.timestamp - b.timestamp);
}

export async function replayEntries(
  entries: TrafficEntry[],
  options: ReplayOptions = {}
): Promise<ReplayResult> {
  const { delayMs = 0, onEntry, filter } = options;
  const sorted = sortEntriesByTime(entries);
  const start = Date.now();
  let replayed = 0;
  let skipped = 0;

  for (const entry of sorted) {
    if (filter && !filter(entry)) {
      skipped++;
      continue;
    }
    if (onEntry) {
      onEntry(entry);
    }
    replayed++;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    replayed,
    skipped,
    durationMs: Date.now() - start,
  };
}

export function sliceReplayWindow(
  entries: TrafficEntry[],
  fromMs: number,
  toMs: number
): TrafficEntry[] {
  return entries.filter(
    (e) => e.timestamp >= fromMs && e.timestamp <= toMs
  );
}
