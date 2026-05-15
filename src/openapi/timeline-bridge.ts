import { OpenAPIObject, PathItemObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { buildTimeline, Timeline } from '../traffic/timeline';

export interface TimelineExtension {
  'x-routewatch-timeline': {
    bucketSizeMs: number;
    startTime: number;
    endTime: number;
    totalRequests: number;
    totalErrors: number;
    bucketCount: number;
  };
}

export function buildTimelineExtension(
  entries: TrafficEntry[],
  bucketSizeMs = 60_000
): TimelineExtension['x-routewatch-timeline'] {
  const timeline = buildTimeline(entries, bucketSizeMs);
  const totalRequests = timeline.buckets.reduce((s, b) => s + b.count, 0);
  const totalErrors = timeline.buckets.reduce((s, b) => s + b.errorCount, 0);
  return {
    bucketSizeMs: timeline.bucketSizeMs,
    startTime: timeline.startTime,
    endTime: timeline.endTime,
    totalRequests,
    totalErrors,
    bucketCount: timeline.buckets.length,
  };
}

export function applyTimelineToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  bucketSizeMs = 60_000
): OpenAPIObject {
  const ext = buildTimelineExtension(entries, bucketSizeMs);
  const updated: OpenAPIObject = {
    ...doc,
    info: {
      ...doc.info,
      'x-routewatch-timeline': ext,
    },
  };

  if (!updated.paths) return updated;

  const paths: Record<string, PathItemObject> = {};
  for (const [routePath, item] of Object.entries(updated.paths)) {
    const routeEntries = entries.filter((e) => e.path === routePath);
    if (routeEntries.length === 0) {
      paths[routePath] = item as PathItemObject;
      continue;
    }
    const routeExt = buildTimelineExtension(routeEntries, bucketSizeMs);
    paths[routePath] = { ...(item as PathItemObject), 'x-routewatch-timeline': routeExt } as PathItemObject;
  }

  return { ...updated, paths };
}
