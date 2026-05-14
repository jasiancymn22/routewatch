import { computeRouteStats, computeTrafficStats } from './stats';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    durationMs: 50,
    ...overrides,
  };
}

describe('computeRouteStats', () => {
  it('returns empty array for no entries', () => {
    expect(computeRouteStats([])).toEqual([]);
  });

  it('groups entries by method and path', () => {
    const entries = [
      makeEntry({ method: 'GET', path: '/api/users', durationMs: 40 }),
      makeEntry({ method: 'GET', path: '/api/users', durationMs: 60 }),
      makeEntry({ method: 'POST', path: '/api/users', durationMs: 80 }),
    ];
    const stats = computeRouteStats(entries);
    expect(stats).toHaveLength(2);
    const getRoute = stats.find((s) => s.method === 'GET')!;
    expect(getRoute.count).toBe(2);
    expect(getRoute.avgDurationMs).toBe(50);
    expect(getRoute.minDurationMs).toBe(40);
    expect(getRoute.maxDurationMs).toBe(60);
  });

  it('counts errors correctly', () => {
    const entries = [
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 404 }),
      makeEntry({ statusCode: 500 }),
    ];
    const stats = computeRouteStats(entries);
    expect(stats[0].errorCount).toBe(2);
  });

  it('tracks status code distribution', () => {
    const entries = [
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 404 }),
    ];
    const stats = computeRouteStats(entries);
    expect(stats[0].statusCodes[200]).toBe(2);
    expect(stats[0].statusCodes[404]).toBe(1);
  });
});

describe('computeTrafficStats', () => {
  it('returns zero stats for empty entries', () => {
    const stats = computeTrafficStats([]);
    expect(stats.totalRequests).toBe(0);
    expect(stats.totalErrors).toBe(0);
    expect(stats.errorRate).toBe(0);
    expect(stats.avgDurationMs).toBe(0);
  });

  it('computes error rate correctly', () => {
    const entries = [
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 500 }),
    ];
    const stats = computeTrafficStats(entries);
    expect(stats.errorRate).toBe(0.5);
    expect(stats.totalErrors).toBe(1);
  });

  it('counts categories', () => {
    const entries = [
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'POST' }),
      makeEntry({ method: 'DELETE' }),
    ];
    const stats = computeTrafficStats(entries);
    expect(stats.categoryCounts.read).toBe(2);
    expect(stats.categoryCounts.write).toBe(1);
    expect(stats.categoryCounts.delete).toBe(1);
  });

  it('counts authenticated requests', () => {
    const entries = [
      makeEntry({ requestHeaders: { authorization: 'Bearer token' } }),
      makeEntry({ requestHeaders: {} }),
    ];
    const stats = computeTrafficStats(entries);
    expect(stats.authenticatedCount).toBe(1);
  });
});
