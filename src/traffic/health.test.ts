import { computeRouteHealth, computeHealthSummary } from './health';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    durationMs: 50,
    ...overrides,
  };
}

describe('computeRouteHealth', () => {
  it('returns healthy status when no errors', () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const result = computeRouteHealth(entries);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('healthy');
    expect(result[0].errorRate).toBe(0);
    expect(result[0].successRate).toBe(1);
  });

  it('returns degraded status when error rate is between 10-30%', () => {
    const entries = [
      ...Array(9).fill(null).map(() => makeEntry({ statusCode: 200 })),
      makeEntry({ statusCode: 500 }),
    ];
    const result = computeRouteHealth(entries);
    expect(result[0].status).toBe('degraded');
    expect(result[0].errorRate).toBeCloseTo(0.1);
  });

  it('returns unhealthy status when error rate >= 30%', () => {
    const entries = [
      ...Array(7).fill(null).map(() => makeEntry({ statusCode: 200 })),
      ...Array(3).fill(null).map(() => makeEntry({ statusCode: 500 })),
    ];
    const result = computeRouteHealth(entries);
    expect(result[0].status).toBe('unhealthy');
    expect(result[0].errorRate).toBeCloseTo(0.3);
  });

  it('groups entries by method and path', () => {
    const entries = [
      makeEntry({ method: 'GET', path: '/a', statusCode: 200 }),
      makeEntry({ method: 'POST', path: '/a', statusCode: 500 }),
    ];
    const result = computeRouteHealth(entries);
    expect(result).toHaveLength(2);
  });

  it('counts total requests correctly', () => {
    const entries = Array(5).fill(null).map(() => makeEntry());
    const result = computeRouteHealth(entries);
    expect(result[0].totalRequests).toBe(5);
  });
});

describe('computeHealthSummary', () => {
  it('returns healthy overall when all routes are healthy', () => {
    const entries = [makeEntry(), makeEntry()];
    const summary = computeHealthSummary(entries);
    expect(summary.overall).toBe('healthy');
    expect(summary.unhealthyCount).toBe(0);
    expect(summary.degradedCount).toBe(0);
  });

  it('returns unhealthy overall when any route is unhealthy', () => {
    const entries = [
      makeEntry({ path: '/ok', statusCode: 200 }),
      ...Array(3).fill(null).map(() => makeEntry({ path: '/bad', statusCode: 500 })),
      ...Array(7).fill(null).map(() => makeEntry({ path: '/bad', statusCode: 200 })),
    ];
    const summary = computeHealthSummary(entries);
    expect(summary.overall).toBe('unhealthy');
    expect(summary.unhealthyCount).toBeGreaterThan(0);
  });

  it('includes all route health entries', () => {
    const entries = [
      makeEntry({ path: '/a' }),
      makeEntry({ path: '/b' }),
    ];
    const summary = computeHealthSummary(entries);
    expect(summary.routes).toHaveLength(2);
  });
});
