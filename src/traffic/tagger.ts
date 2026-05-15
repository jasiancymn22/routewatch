import { TrafficEntry } from './types';

export type TagRule = {
  tag: string;
  match: (entry: TrafficEntry) => boolean;
};

export type TaggedEntry = TrafficEntry & { tags: string[] };

export function applyTagRules(
  entry: TrafficEntry,
  rules: TagRule[]
): TaggedEntry {
  const tags = rules
    .filter((rule) => rule.match(entry))
    .map((rule) => rule.tag);
  return { ...entry, tags };
}

export function tagEntries(
  entries: TrafficEntry[],
  rules: TagRule[]
): TaggedEntry[] {
  return entries.map((entry) => applyTagRules(entry, rules));
}

export function filterByTag(
  entries: TaggedEntry[],
  tag: string
): TaggedEntry[] {
  return entries.filter((entry) => entry.tags.includes(tag));
}

export function groupByTag(
  entries: TaggedEntry[]
): Record<string, TaggedEntry[]> {
  const result: Record<string, TaggedEntry[]> = {};
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!result[tag]) result[tag] = [];
      result[tag].push(entry);
    }
  }
  return result;
}

export function getUniqueTags(entries: TaggedEntry[]): string[] {
  const tagSet = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

export const builtinTagRules: TagRule[] = [
  { tag: 'authenticated', match: (e) => !!e.requestHeaders?.['authorization'] },
  { tag: 'error', match: (e) => e.statusCode >= 400 },
  { tag: 'slow', match: (e) => (e.durationMs ?? 0) > 1000 },
  { tag: 'mutation', match: (e) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(e.method.toUpperCase()) },
  { tag: 'read', match: (e) => e.method.toUpperCase() === 'GET' },
];
