import { detectDependencies, buildDependencyMap, topDependencies } from './dependency';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    body: null,
    responseBody: null,
    durationMs: 20,
    ...overrides,
  };
}

describe('detectDependencies', () => {
  it('returns empty array for single entry', () => {
    const entries = [makeEntry()];
    expect(detectDependencies(entries)).toEqual([]);
  });

  it('detects a dependency between two close entries', () => {
    const now = 1000;
    const entries = [
      makeEntry({ path: '/api/users', timestamp: now }),
      makeEntry({ path: '/api/orders', timestamp: now + 100 }),
    ];
    const deps = detectDependencies(entries, 500);
    expect(deps).toHaveLength(1);
    expect(deps[0].from).toBe('GET:/api/users');
    expect(deps[0].to).toBe('GET:/api/orders');
    expect(deps[0].count).toBe(1);
    expect(deps[0].avgGapMs).toBe(100);
  });

  it('ignores entries outside the time window', () => {
    const now = 1000;
    const entries = [
      makeEntry({ path: '/api/a', timestamp: now }),
      makeEntry({ path: '/api/b', timestamp: now + 1000 }),
    ];
    const deps = detectDependencies(entries, 500);
    expect(deps).toHaveLength(0);
  });

  it('accumulates counts for repeated pairs', () => {
    const now = 1000;
    const entries = [
      makeEntry({ path: '/api/a', timestamp: now }),
      makeEntry({ path: '/api/b', timestamp: now + 100 }),
      makeEntry({ path: '/api/a', timestamp: now + 600 }),
      makeEntry({ path: '/api/b', timestamp: now + 700 }),
    ];
    const deps = detectDependencies(entries, 500);
    const pair = deps.find(d => d.from === 'GET:/api/a' && d.to === 'GET:/api/b');
    expect(pair).toBeDefined();
    expect(pair!.count).toBe(2);
  });

  it('skips same-route pairs', () => {
    const now = 1000;
    const entries = [
      makeEntry({ path: '/api/a', timestamp: now }),
      makeEntry({ path: '/api/a', timestamp: now + 50 }),
    ];
    expect(detectDependencies(entries, 500)).toHaveLength(0);
  });
});

describe('buildDependencyMap', () => {
  it('groups dependencies by from route', () => {
    const deps = [
      { from: 'GET:/a', to: 'GET:/b', count: 3, avgGapMs: 50 },
      { from: 'GET:/a', to: 'GET:/c', count: 1, avgGapMs: 200 },
      { from: 'GET:/b', to: 'GET:/c', count: 2, avgGapMs: 80 },
    ];
    const map = buildDependencyMap(deps);
    expect(map['GET:/a']).toHaveLength(2);
    expect(map['GET:/b']).toHaveLength(1);
  });
});

describe('topDependencies', () => {
  it('returns top N by count', () => {
    const deps = [
      { from: 'GET:/a', to: 'GET:/b', count: 1, avgGapMs: 10 },
      { from: 'GET:/c', to: 'GET:/d', count: 5, avgGapMs: 20 },
      { from: 'GET:/e', to: 'GET:/f', count: 3, avgGapMs: 30 },
    ];
    const top = topDependencies(deps, 2);
    expect(top[0].count).toBe(5);
    expect(top[1].count).toBe(3);
    expect(top).toHaveLength(2);
  });
});
