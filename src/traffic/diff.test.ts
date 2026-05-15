import { diffEntries, diffRoutes, hasDrift } from './diff';
import { TrafficEntry } from './types';

function makeEntry(method: string, path: string, status = 200): TrafficEntry {
  return {
    method,
    path,
    statusCode: status,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: undefined,
    responseBody: undefined,
    query: {},
    timestamp: Date.now(),
  };
}

describe('diffEntries', () => {
  it('detects added entries', () => {
    const before = [makeEntry('GET', '/users')];
    const after = [makeEntry('GET', '/users'), makeEntry('POST', '/users')];
    const result = diffEntries(before, after);
    expect(result.added).toHaveLength(1);
    expect(result.added[0].method).toBe('POST');
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(1);
  });

  it('detects removed entries', () => {
    const before = [makeEntry('GET', '/users'), makeEntry('DELETE', '/users')];
    const after = [makeEntry('GET', '/users')];
    const result = diffEntries(before, after);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].method).toBe('DELETE');
    expect(result.added).toHaveLength(0);
  });

  it('returns all unchanged when snapshots are identical', () => {
    const entries = [makeEntry('GET', '/a'), makeEntry('POST', '/b')];
    const result = diffEntries(entries, entries);
    expect(result.unchanged).toHaveLength(2);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it('handles empty before', () => {
    const after = [makeEntry('GET', '/new')];
    const result = diffEntries([], after);
    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
  });

  it('handles empty after', () => {
    const before = [makeEntry('GET', '/old')];
    const result = diffEntries(before, []);
    expect(result.removed).toHaveLength(1);
    expect(result.added).toHaveLength(0);
  });
});

describe('diffRoutes', () => {
  it('identifies added and removed routes', () => {
    const before = [makeEntry('GET', '/a'), makeEntry('GET', '/b')];
    const after = [makeEntry('GET', '/a'), makeEntry('GET', '/c')];
    const result = diffRoutes(before, after);
    expect(result.addedRoutes).toContain('GET:/c');
    expect(result.removedRoutes).toContain('GET:/b');
    expect(result.commonRoutes).toContain('GET:/a');
  });
});

describe('hasDrift', () => {
  it('returns true when routes differ', () => {
    const diff = { addedRoutes: ['GET:/new'], removedRoutes: [], commonRoutes: [] };
    expect(hasDrift(diff)).toBe(true);
  });

  it('returns false when no drift', () => {
    const diff = { addedRoutes: [], removedRoutes: [], commonRoutes: ['GET:/a'] };
    expect(hasDrift(diff)).toBe(false);
  });
});
