import {
  computeMean,
  computeStdDev,
  zScore,
  detectLatencyOutliers,
  detectOutliersByRoute,
  summarizeOutliers,
} from './outlier';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    id: Math.random().toString(36).slice(2),
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    durationMs: 100,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('computeMean', () => {
  it('returns 0 for empty array', () => {
    expect(computeMean([])).toBe(0);
  });

  it('computes correct mean', () => {
    expect(computeMean([10, 20, 30])).toBe(20);
  });
});

describe('computeStdDev', () => {
  it('returns 0 for single value', () => {
    expect(computeStdDev([5], 5)).toBe(0);
  });

  it('computes correct std dev', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const mean = computeMean(values);
    const stdDev = computeStdDev(values, mean);
    expect(stdDev).toBeCloseTo(2.0, 0);
  });
});

describe('zScore', () => {
  it('returns 0 when stdDev is 0', () => {
    expect(zScore(5, 5, 0)).toBe(0);
  });

  it('computes correct z-score', () => {
    expect(zScore(10, 5, 2.5)).toBeCloseTo(2.0);
  });
});

describe('detectLatencyOutliers', () => {
  it('returns empty for fewer than 3 entries', () => {
    const entries = [makeEntry(), makeEntry()];
    expect(detectLatencyOutliers(entries)).toHaveLength(0);
  });

  it('detects high latency outlier', () => {
    const normal = Array.from({ length: 10 }, () => makeEntry({ durationMs: 100 }));
    const spike = makeEntry({ durationMs: 9999 });
    const outliers = detectLatencyOutliers([...normal, spike]);
    expect(outliers.some((o) => o.entry === spike)).toBe(true);
  });

  it('does not flag normal entries', () => {
    const entries = Array.from({ length: 10 }, (_, i) => makeEntry({ durationMs: 90 + i }));
    expect(detectLatencyOutliers(entries)).toHaveLength(0);
  });
});

describe('detectOutliersByRoute', () => {
  it('groups outliers by route key', () => {
    const normal = Array.from({ length: 10 }, () =>
      makeEntry({ method: 'GET', path: '/api/users', durationMs: 100 })
    );
    const spike = makeEntry({ method: 'GET', path: '/api/users', durationMs: 9999 });
    const result = detectOutliersByRoute([...normal, spike]);
    expect(result.has('GET:/api/users')).toBe(true);
  });
});

describe('summarizeOutliers', () => {
  it('returns zeros for empty outliers', () => {
    expect(summarizeOutliers([])).toEqual({ count: 0, maxZScore: 0, avgZScore: 0 });
  });

  it('summarizes correctly', () => {
    const entry = makeEntry();
    const outliers = [{ entry, reason: 'latency', zScore: 3.0 }, { entry, reason: 'latency', zScore: 5.0 }];
    const summary = summarizeOutliers(outliers);
    expect(summary.count).toBe(2);
    expect(summary.maxZScore).toBe(5.0);
    expect(summary.avgZScore).toBe(4.0);
  });
});
