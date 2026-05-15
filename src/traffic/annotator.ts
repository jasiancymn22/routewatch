import { TrafficEntry } from "./types";

export type EntryAnnotation = {
  tags: string[];
  deprecated?: boolean;
  summary?: string;
  description?: string;
};

export type AnnotationMap = Map<string, EntryAnnotation>;

export function buildAnnotationKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`;
}

export function createAnnotationMap(): AnnotationMap {
  return new Map();
}

export function annotateEntry(
  map: AnnotationMap,
  method: string,
  path: string,
  annotation: Partial<EntryAnnotation>
): AnnotationMap {
  const key = buildAnnotationKey(method, path);
  const existing = map.get(key) ?? { tags: [] };
  map.set(key, {
    ...existing,
    ...annotation,
    tags: [...new Set([...existing.tags, ...(annotation.tags ?? [])])],
  });
  return map;
}

export function getAnnotation(
  map: AnnotationMap,
  method: string,
  path: string
): EntryAnnotation | undefined {
  return map.get(buildAnnotationKey(method, path));
}

export function applyAnnotationsToEntries(
  entries: TrafficEntry[],
  map: AnnotationMap
): Array<TrafficEntry & { annotation?: EntryAnnotation }> {
  return entries.map((entry) => {
    const annotation = getAnnotation(map, entry.method, entry.path);
    return annotation ? { ...entry, annotation } : entry;
  });
}

export function mergeAnnotationMaps(
  base: AnnotationMap,
  override: AnnotationMap
): AnnotationMap {
  const result = new Map(base);
  for (const [key, annotation] of override.entries()) {
    const existing = result.get(key) ?? { tags: [] };
    result.set(key, {
      ...existing,
      ...annotation,
      tags: [...new Set([...existing.tags, ...annotation.tags])],
    });
  }
  return result;
}
