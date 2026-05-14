import { paginateEntries, paginateByRoute, getPage } from './paginator';
import { TrafficEntry } from './types';

function makeEntry(path: string, id: number): TrafficEntry {
  return {
    path,
    method: 'GET',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: undefined,
    responseBody: undefined,
    query: {},
    timestamp: Date.now() + id,
    durationMs: 10,
  };
}

const entries = Array.from({ length: 25 }, (_, i) => makeEntry('/api/items', i));

describe('paginateEntries', () => {
  it('returns first page correctly', () => {
    const result = paginateEntries(entries, { page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(10);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it('returns last page with remaining items', () => {
    const result = paginateEntries(entries, { page: 3, pageSize: 10 });
    expect(result.items).toHaveLength(5);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  it('clamps page to totalPages when out of range', () => {
    const result = paginateEntries(entries, { page: 99, pageSize: 10 });
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(5);
  });

  it('throws on invalid page', () => {
    expect(() => paginateEntries(entries, { page: 0, pageSize: 10 })).toThrow();
  });

  it('throws on invalid pageSize', () => {
    expect(() => paginateEntries(entries, { page: 1, pageSize: 0 })).toThrow();
  });

  it('handles empty entries', () => {
    const result = paginateEntries([], { page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(0);
    expect(result.totalPages).toBe(1);
    expect(result.total).toBe(0);
  });
});

describe('paginateByRoute', () => {
  const mixed = [
    ...Array.from({ length: 8 }, (_, i) => makeEntry('/api/items', i)),
    ...Array.from({ length: 5 }, (_, i) => makeEntry('/api/users', i + 100)),
  ];

  it('filters by route before paginating', () => {
    const result = paginateByRoute(mixed, '/api/items', { page: 1, pageSize: 5 });
    expect(result.total).toBe(8);
    expect(result.items).toHaveLength(5);
  });

  it('returns empty for unknown route', () => {
    const result = paginateByRoute(mixed, '/api/unknown', { page: 1, pageSize: 10 });
    expect(result.total).toBe(0);
  });
});

describe('getPage', () => {
  it('slices items correctly', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(getPage(items, 1, 3)).toEqual([1, 2, 3]);
    expect(getPage(items, 2, 3)).toEqual([4, 5, 6]);
    expect(getPage(items, 3, 3)).toEqual([7]);
  });
});
