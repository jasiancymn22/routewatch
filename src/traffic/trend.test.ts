import { buildTrend, computeTrendPoint, detectDirection, computeChangePercent, TrendPoint } from './trend';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    durationMs: 100,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

describe('computeTrendPoint', () => {
  it('returns zeros for empty array', () => {
    const point = computeTrendPoint([]);
    expect(point.count).toBe(0);
    expect(point.errorRate).toBe(0);
    expect(point.avgLatency).toBe(0);
  });

  it('computes error rate correctly', () => {
    const entries = [
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 500 }),
      makeEntry({ statusCode: 404 }),
    ];
    const point = computeTrendPoint(entries);
    expect(point.count).toBe(3);
    expect(point.errorRate).toBeCloseTo(2 / 3);
  });

  it('computes average latency', () => {
    const entries = [
      makeEntry({ durationMs: 100 }),
      makeEntry({ durationMs: 200 }),
    ];
    const point = computeTrendPoint(entries);
    expect(point.avgLatency).toBe(150);
  });
});

describe('detectDirection', () => {
  it('returns stable for single point', () => {
    const pts: TrendPoint[] = [{ timestamp: 0, count: 10, errorRate: 0, avgLatency: 0 }];
    expect(detectDirection(pts)).toBe('stable');
  });

  it('returns up when count increases significantly', () => {
    const pts: TrendPoint[] = [
      { timestamp: 0, count: 10, errorRate: 0, avgLatency: 0 },
      { timestamp: 1, count: 20, errorRate: 0, avgLatency: 0 },
    ];
    expect(detectDirection(pts)).toBe('up');
  });

  it('returns down when count decreases significantly', () => {
    const pts: TrendPoint[] = [
      { timestamp: 0, count: 20, errorRate: 0, avgLatency: 0 },
      { timestamp: 1, count: 5, errorRate: 0, avgLatency: 0 },
    ];
    expect(detectDirection(pts)).toBe('down');
  });
});

describe('computeChangePercent', () => {
  it('returns 0 for single point', () => {
    expect(computeChangePercent([{ timestamp: 0, count: 5, errorRate: 0, avgLatency: 0 }])).toBe(0);
  });

  it('computes percent change', () => {
    const pts: TrendPoint[] = [
      { timestamp: 0, count: 100, errorRate: 0, avgLatency: 0 },
      { timestamp: 1, count: 150, errorRate: 0, avgLatency: 0 },
    ];
    expect(computeChangePercent(pts)).toBe(50);
  });
});

describe('buildTrend', () => {
  it('groups entries by route and method', () => {
    const now = Date.now();
    const entries = [
      makeEntry({ method: 'GET', path: '/a', timestamp: now }),
      makeEntry({ method: 'POST', path: '/a', timestamp: now }),
      makeEntry({ method: 'GET', path: '/a', timestamp: now + 1000 }),
    ];
    const trends = buildTrend(entries, 10_000);
    const routes = trends.map(t => `${t.method}:${t.route}`);
    expect(routes).toContain('GET:/a');
    expect(routes).toContain('POST:/a');
  });
});
