import { buildTimeline, bucketEntries, sliceTimeline } from './timeline';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    requestBody: undefined,
    responseBody: undefined,
    durationMs: 10,
    ...overrides,
  };
}

const BASE = 1_000_000;

describe('bucketEntries', () => {
  it('returns empty array for no entries', () => {
    expect(bucketEntries([], 60_000)).toEqual([]);
  });

  it('places entries into correct buckets', () => {
    const entries = [
      makeEntry({ timestamp: BASE, path: '/a' }),
      makeEntry({ timestamp: BASE + 30_000, path: '/b' }),
      makeEntry({ timestamp: BASE + 90_000, path: '/c' }),
    ];
    const buckets = bucketEntries(entries, 60_000);
    expect(buckets).toHaveLength(2);
    expect(buckets[0].count).toBe(2);
    expect(buckets[1].count).toBe(1);
  });

  it('counts error responses', () => {
    const entries = [
      makeEntry({ timestamp: BASE, statusCode: 500 }),
      makeEntry({ timestamp: BASE + 1000, statusCode: 200 }),
    ];
    const buckets = bucketEntries(entries, 60_000);
    expect(buckets[0].errorCount).toBe(1);
  });

  it('tracks unique routes per bucket', () => {
    const entries = [
      makeEntry({ timestamp: BASE, path: '/x' }),
      makeEntry({ timestamp: BASE + 1000, path: '/x' }),
      makeEntry({ timestamp: BASE + 2000, path: '/y' }),
    ];
    const buckets = bucketEntries(entries, 60_000);
    expect(buckets[0].routes).toEqual(['/x', '/y']);
  });
});

describe('buildTimeline', () => {
  it('returns zero-time timeline for empty entries', () => {
    const t = buildTimeline([]);
    expect(t.buckets).toHaveLength(0);
    expect(t.startTime).toBe(0);
    expect(t.endTime).toBe(0);
  });

  it('sets startTime and endTime correctly', () => {
    const entries = [
      makeEntry({ timestamp: BASE }),
      makeEntry({ timestamp: BASE + 120_000 }),
    ];
    const t = buildTimeline(entries, 60_000);
    expect(t.startTime).toBe(BASE);
    expect(t.endTime).toBe(BASE + 120_000 + 60_000);
  });
});

describe('sliceTimeline', () => {
  it('filters buckets to the given time range', () => {
    const entries = [
      makeEntry({ timestamp: BASE }),
      makeEntry({ timestamp: BASE + 60_000 }),
      makeEntry({ timestamp: BASE + 120_000 }),
    ];
    const timeline = buildTimeline(entries, 60_000);
    const sliced = sliceTimeline(timeline, BASE + 60_000, BASE + 120_000);
    expect(sliced.buckets).toHaveLength(2);
    expect(sliced.startTime).toBe(BASE + 60_000);
  });
});
