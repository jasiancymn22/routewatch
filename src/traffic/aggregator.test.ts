import { aggregateEntries, topRoutes, routesSince } from './aggregator';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    timestamp: Date.now(),
    statusCode: 200,
    responseTime: 50,
    requestHeaders: {},
    responseHeaders: {},
    query: {},
    ...overrides,
  };
}

describe('aggregateEntries', () => {
  it('returns empty array for no entries', () => {
    expect(aggregateEntries([])).toEqual([]);
  });

  it('aggregates a single entry correctly', () => {
    const entry = makeEntry({ path: '/api/items', statusCode: 200, responseTime: 100 });
    const result = aggregateEntries([entry]);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(1);
    expect(result[0].statusCodes).toEqual({ 200: 1 });
    expect(result[0].avgResponseTime).toBe(100);
  });

  it('groups entries by method and path', () => {
    const entries = [
      makeEntry({ method: 'GET', path: '/a' }),
      makeEntry({ method: 'POST', path: '/a' }),
      makeEntry({ method: 'GET', path: '/a' }),
    ];
    const result = aggregateEntries(entries);
    expect(result).toHaveLength(2);
    const get = result.find((r) => r.method === 'GET')!;
    expect(get.count).toBe(2);
  });

  it('calculates average response time across multiple entries', () => {
    const entries = [
      makeEntry({ responseTime: 100 }),
      makeEntry({ responseTime: 200 }),
    ];
    const result = aggregateEntries(entries);
    expect(result[0].avgResponseTime).toBeCloseTo(150);
  });

  it('tracks firstSeen and lastSeen timestamps', () => {
    const entries = [
      makeEntry({ timestamp: 1000 }),
      makeEntry({ timestamp: 3000 }),
      makeEntry({ timestamp: 2000 }),
    ];
    const result = aggregateEntries(entries);
    expect(result[0].firstSeen).toBe(1000);
    expect(result[0].lastSeen).toBe(3000);
  });

  it('counts multiple status codes separately', () => {
    const entries = [
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 404 }),
      makeEntry({ statusCode: 200 }),
    ];
    const result = aggregateEntries(entries);
    expect(result[0].statusCodes).toEqual({ 200: 2, 404: 1 });
  });
});

describe('topRoutes', () => {
  it('returns routes sorted by count descending', () => {
    const entries = [
      makeEntry({ path: '/a' }),
      makeEntry({ path: '/b' }),
      makeEntry({ path: '/b' }),
      makeEntry({ path: '/c' }),
      makeEntry({ path: '/c' }),
      makeEntry({ path: '/c' }),
    ];
    const aggregated = aggregateEntries(entries);
    const top = topRoutes(aggregated, 2);
    expect(top[0].path).toBe('/c');
    expect(top[1].path).toBe('/b');
    expect(top).toHaveLength(2);
  });
});

describe('routesSince', () => {
  it('filters routes by lastSeen timestamp', () => {
    const aggregated = [
      { method: 'GET', path: '/old', count: 1, firstSeen: 100, lastSeen: 500, statusCodes: {} },
      { method: 'GET', path: '/new', count: 1, firstSeen: 900, lastSeen: 1500, statusCodes: {} },
    ];
    const result = routesSince(aggregated, 1000);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/new');
  });
});
