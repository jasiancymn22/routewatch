import { TrafficEntry } from './types';

export interface Segment {
  name: string;
  entries: TrafficEntry[];
  count: number;
}

export type SegmentRule = {
  name: string;
  match: (entry: TrafficEntry) => boolean;
};

export function segmentEntries(
  entries: TrafficEntry[],
  rules: SegmentRule[]
): Map<string, Segment> {
  const map = new Map<string, Segment>();

  for (const rule of rules) {
    map.set(rule.name, { name: rule.name, entries: [], count: 0 });
  }
  map.set('unmatched', { name: 'unmatched', entries: [], count: 0 });

  for (const entry of entries) {
    let matched = false;
    for (const rule of rules) {
      if (rule.match(entry)) {
        const seg = map.get(rule.name)!;
        seg.entries.push(entry);
        seg.count++;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const seg = map.get('unmatched')!;
      seg.entries.push(entry);
      seg.count++;
    }
  }

  return map;
}

export function getSegmentNames(map: Map<string, Segment>): string[] {
  return Array.from(map.keys());
}

export function mergeSegments(
  a: Map<string, Segment>,
  b: Map<string, Segment>
): Map<string, Segment> {
  const result = new Map<string, Segment>();
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  for (const key of allKeys) {
    const aEntries = a.get(key)?.entries ?? [];
    const bEntries = b.get(key)?.entries ?? [];
    const combined = [...aEntries, ...bEntries];
    result.set(key, { name: key, entries: combined, count: combined.length });
  }
  return result;
}
