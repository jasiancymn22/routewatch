import { buildLatencyReport, computeLatencyBucket } from './latency';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    durationMs: 100,
    ...overrides,
  };
}

describe('computeLatencyBucket', () => {
  it('returns zeros for empty entries', () => {
    const bucket = computeLatencyBucket('/api/test', 'GET', []);
    expect(bucket.p50).toBe(0);
    expect(bucket.p99).toBe(0);
    expect(bucket.count).toBe(0);
  });

  it('computes percentiles correctly', () => {
    const entries = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((durationMs) =>
      makeEntry({ durationMs })
    );
    const bucket = computeLatencyBucket('/api/test', 'GET', entries);
    expect(bucket.min).toBe(10);
    expect(bucket.max).toBe(100);
    expect(bucket.p50).toBe(50);
    expect(bucket.p90).toBe(90);
    expect(bucket.p99).toBe(100);
    expect(bucket.count).toBe(10);
  });

  it('computes mean correctly', () => {
    const entries = [makeEntry({ durationMs: 100 }), makeEntry({ durationMs: 200 })];
    const bucket = computeLatencyBucket('/api/test', 'GET', entries);
    expect(bucket.mean).toBe(150);
  });
});

describe('buildLatencyReport', () => {
  it('groups entries by route and method', () => {
    const entries = [
      makeEntry({ method: 'GET', path: '/users', durationMs: 50 }),
      makeEntry({ method: 'GET', path: '/users', durationMs: 150 }),
      makeEntry({ method: 'POST', path: '/users', durationMs: 200 }),
    ];
    const report = buildLatencyReport(entries);
    expect(report.buckets).toHaveLength(2);
    const getBucket = report.buckets.find((b) => b.method === 'GET' && b.route === '/users');
    expect(getBucket?.count).toBe(2);
    expect(getBucket?.mean).toBe(100);
  });

  it('returns empty buckets for no entries', () => {
    const report = buildLatencyReport([]);
    expect(report.buckets).toHaveLength(0);
    expect(report.generatedAt).toBeGreaterThan(0);
  });

  it('handles missing durationMs as 0', () => {
    const entries = [makeEntry({ durationMs: undefined as unknown as number })];
    const report = buildLatencyReport(entries);
    expect(report.buckets[0].min).toBe(0);
  });
});
