import { OpenAPIObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { segmentEntries, SegmentRule } from '../traffic/segmenter';

export interface SegmentExtension {
  'x-segment-counts': Record<string, number>;
  'x-segment-rules': string[];
}

const DEFAULT_RULES: SegmentRule[] = [
  { name: 'success', match: (e) => e.statusCode >= 200 && e.statusCode < 300 },
  { name: 'redirect', match: (e) => e.statusCode >= 300 && e.statusCode < 400 },
  { name: 'client-error', match: (e) => e.statusCode >= 400 && e.statusCode < 500 },
  { name: 'server-error', match: (e) => e.statusCode >= 500 },
];

export function buildSegmentExtension(
  entries: TrafficEntry[],
  rules: SegmentRule[] = DEFAULT_RULES
): SegmentExtension {
  const map = segmentEntries(entries, rules);
  const counts: Record<string, number> = {};
  for (const [name, seg] of map.entries()) {
    if (seg.count > 0) {
      counts[name] = seg.count;
    }
  }
  return {
    'x-segment-counts': counts,
    'x-segment-rules': rules.map((r) => r.name),
  };
}

export function applySegmentsToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  rules?: SegmentRule[]
): OpenAPIObject {
  const ext = buildSegmentExtension(entries, rules);
  return {
    ...doc,
    info: {
      ...doc.info,
      ...ext,
    },
  };
}
