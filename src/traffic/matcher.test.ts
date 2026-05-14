import {
  buildRoutePattern,
  matchEntry,
  findMatchingPattern,
  filterByPattern,
  groupByPattern,
} from './matcher';
import { TrafficEntry } from './types';

function makeEntry(method: string, path: string): TrafficEntry {
  return {
    method,
    path,
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    durationMs: 10,
  };
}

describe('buildRoutePattern', () => {
  it('builds a pattern that matches exact paths', () => {
    const p = buildRoutePattern('GET', '/health');
    expect(p.regex.test('/health')).toBe(true);
    expect(p.regex.test('/health/extra')).toBe(false);
  });

  it('builds a pattern that matches path params', () => {
    const p = buildRoutePattern('GET', '/users/:id');
    expect(p.regex.test('/users/42')).toBe(true);
    expect(p.regex.test('/users/abc')).toBe(true);
    expect(p.regex.test('/users/')).toBe(false);
  });

  it('normalises method to uppercase', () => {
    const p = buildRoutePattern('post', '/items');
    expect(p.method).toBe('POST');
  });
});

describe('matchEntry', () => {
  it('returns true when method and path match', () => {
    const p = buildRoutePattern('GET', '/users/:id');
    expect(matchEntry(makeEntry('GET', '/users/7'), p)).toBe(true);
  });

  it('returns false when method differs', () => {
    const p = buildRoutePattern('POST', '/users/:id');
    expect(matchEntry(makeEntry('GET', '/users/7'), p)).toBe(false);
  });
});

describe('findMatchingPattern', () => {
  const patterns = [
    buildRoutePattern('GET', '/users/:id'),
    buildRoutePattern('POST', '/users'),
  ];

  it('returns the matching pattern', () => {
    const result = findMatchingPattern(makeEntry('POST', '/users'), patterns);
    expect(result?.pattern).toBe('/users');
  });

  it('returns undefined when nothing matches', () => {
    expect(findMatchingPattern(makeEntry('DELETE', '/users/1'), patterns)).toBeUndefined();
  });
});

describe('filterByPattern', () => {
  const patterns = [buildRoutePattern('GET', '/items/:id')];

  it('keeps only matching entries', () => {
    const entries = [
      makeEntry('GET', '/items/1'),
      makeEntry('POST', '/items'),
      makeEntry('GET', '/items/99'),
    ];
    expect(filterByPattern(entries, patterns)).toHaveLength(2);
  });
});

describe('groupByPattern', () => {
  const patterns = [
    buildRoutePattern('GET', '/users/:id'),
    buildRoutePattern('POST', '/users'),
  ];

  it('groups entries under their pattern key', () => {
    const entries = [
      makeEntry('GET', '/users/1'),
      makeEntry('GET', '/users/2'),
      makeEntry('POST', '/users'),
      makeEntry('DELETE', '/other'),
    ];
    const groups = groupByPattern(entries, patterns);
    expect(groups.get('GET /users/:id')).toHaveLength(2);
    expect(groups.get('POST /users')).toHaveLength(1);
    expect(groups.get('__unmatched__')).toHaveLength(1);
  });
});
