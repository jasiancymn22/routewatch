import { TrafficEntry } from './types';

export interface TimelineBucket {
  timestamp: number;
  count: number;
  routes: string[];
  errorCount: number;
}

export interface Timeline {
  buckets: TimelineBucket[];
  bucketSizeMs: number;
  startTime: number;
  endTime: number;
}

export function bucketEntries(
  entries: TrafficEntry[],
  bucketSizeMs: number
): TimelineBucket[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sorted[0].timestamp;
  const endTime = sorted[sorted.length - 1].timestamp;
  const bucketCount = Math.ceil((endTime - startTime + 1) / bucketSizeMs);

  const buckets: TimelineBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    timestamp: startTime + i * bucketSizeMs,
    count: 0,
    routes: [],
    errorCount: 0,
  }));

  for (const entry of sorted) {
    const idx = Math.floor((entry.timestamp - startTime) / bucketSizeMs);
    const bucket = buckets[Math.min(idx, buckets.length - 1)];
    bucket.count++;
    if (!bucket.routes.includes(entry.path)) bucket.routes.push(entry.path);
    if (entry.statusCode >= 400) bucket.errorCount++;
  }

  return buckets;
}

export function buildTimeline(
  entries: TrafficEntry[],
  bucketSizeMs = 60_000
): Timeline {
  const buckets = bucketEntries(entries, bucketSizeMs);
  const startTime = buckets.length > 0 ? buckets[0].timestamp : 0;
  const endTime =
    buckets.length > 0 ? buckets[buckets.length - 1].timestamp + bucketSizeMs : 0;
  return { buckets, bucketSizeMs, startTime, endTime };
}

export function sliceTimeline(timeline: Timeline, fromMs: number, toMs: number): Timeline {
  const buckets = timeline.buckets.filter(
    (b) => b.timestamp >= fromMs && b.timestamp <= toMs
  );
  return {
    ...timeline,
    buckets,
    startTime: buckets.length > 0 ? buckets[0].timestamp : fromMs,
    endTime: buckets.length > 0 ? buckets[buckets.length - 1].timestamp : toMs,
  };
}
