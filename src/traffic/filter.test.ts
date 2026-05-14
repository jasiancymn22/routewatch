import { filterEntries, groupByMethod, sortByFrequency } from './filter';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    requestCount: 5,
    queryParams: {},
    requestBodies: [],
    responses: [{ statusCode: 200, bodies: [] }],
    ...overrides,
  };
}

describe('filterEntries', () => {
  it('filters by method', () => {
    const entries = [
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'POST' }),
      makeEntry({ method: 'DELETE' }),
    ];
    const result = filterEntries(entries, { methods: ['GET', 'POST'] });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.method)).toEqual(['GET', 'POST']);
  });

  it('filters by path pattern', () => {
    const entries = [
      makeEntry({ path: '/api/users' }),
      makeEntry({ path: '/api/posts' }),
      makeEntry({ path: '/health' }),
    ];
    const result = filterEntries(entries, { pathPattern: /^\/api/ });
    expect(result).toHaveLength(2);
  });

  it('filters by status codes', () => {
    const entries = [
      makeEntry({ responses: [{ statusCode: 200, bodies: [] }] }),
      makeEntry({ responses: [{ statusCode: 404, bodies: [] }] }),
      makeEntry({ responses: [{ statusCode: 500, bodies: [] }] }),
    ];
    const result = filterEntries(entries, { statusCodes: [200, 404] });
    expect(result).toHaveLength(2);
  });

  it('filters by minimum request count', () => {
    const entries = [
      makeEntry({ requestCount: 1 }),
      makeEntry({ requestCount: 10 }),
      makeEntry({ requestCount: 5 }),
    ];
    const result = filterEntries(entries, { minRequests: 5 });
    expect(result).toHaveLength(2);
  });

  it('returns all entries when no filters applied', () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    expect(filterEntries(entries, {})).toHaveLength(3);
  });
});

describe('groupByMethod', () => {
  it('groups entries by HTTP method', () => {
    const entries = [
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'POST' }),
      makeEntry({ method: 'GET' }),
    ];
    const result = groupByMethod(entries);
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['GET', 'POST']));
    expect(result['GET']).toHaveLength(2);
    expect(result['POST']).toHaveLength(1);
  });
});

describe('sortByFrequency', () => {
  it('sorts entries by requestCount descending', () => {
    const entries = [
      makeEntry({ requestCount: 3 }),
      makeEntry({ requestCount: 10 }),
      makeEntry({ requestCount: 1 }),
    ];
    const result = sortByFrequency(entries);
    expect(result.map((e) => e.requestCount)).toEqual([10, 3, 1]);
  });

  it('does not mutate original array', () => {
    const entries = [makeEntry({ requestCount: 2 }), makeEntry({ requestCount: 8 })];
    sortByFrequency(entries);
    expect(entries[0].requestCount).toBe(2);
  });
});
