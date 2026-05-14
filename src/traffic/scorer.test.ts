import { scoreRoute, scoreRoutes } from './scorer';
import { buildRoutePattern } from './matcher';
import { TrafficEntry } from './types';

function makeEntry(
  method: string,
  path: string,
  statusCode = 200,
  durationMs = 50
): TrafficEntry {
  return {
    method,
    path,
    statusCode,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    durationMs,
  };
}

describe('scoreRoute', () => {
  const pattern = buildRoutePattern('GET', '/users/:id');

  it('returns zero score for empty entries', () => {
    const result = scoreRoute('GET /users/:id', pattern, [], 100);
    expect(result.score).toBe(0);
    expect(result.errorRate).toBe(0);
    expect(result.avgDurationMs).toBe(0);
  });

  it('computes error rate correctly', () => {
    const entries = [
      makeEntry('GET', '/users/1', 500),
      makeEntry('GET', '/users/2', 200),
    ];
    const result = scoreRoute('GET /users/:id', pattern, entries, 10);
    expect(result.errorRate).toBeCloseTo(0.5);
  });

  it('computes avgDurationMs correctly', () => {
    const entries = [
      makeEntry('GET', '/users/1', 200, 100),
      makeEntry('GET', '/users/2', 200, 300),
    ];
    const result = scoreRoute('GET /users/:id', pattern, entries, 10);
    expect(result.avgDurationMs).toBe(200);
  });

  it('assigns higher score to high-error high-latency routes', () => {
    const badEntries = [
      makeEntry('GET', '/users/1', 500, 600),
      makeEntry('GET', '/users/2', 500, 600),
    ];
    const goodEntries = [makeEntry('GET', '/users/3', 200, 10)];
    const bad = scoreRoute('GET /users/:id', pattern, badEntries, 10);
    const good = scoreRoute('GET /users/:id', pattern, goodEntries, 10);
    expect(bad.score).toBeGreaterThan(good.score);
  });
});

describe('scoreRoutes', () => {
  const patterns = [
    buildRoutePattern('GET', '/users/:id'),
    buildRoutePattern('POST', '/users'),
  ];

  it('returns a score for every pattern', () => {
    const entries = [
      makeEntry('GET', '/users/1'),
      makeEntry('POST', '/users'),
    ];
    const scores = scoreRoutes(entries, patterns);
    expect(scores).toHaveLength(2);
  });

  it('sorts by score descending', () => {
    const entries = [
      makeEntry('GET', '/users/1', 500, 700),
      makeEntry('GET', '/users/2', 500, 700),
      makeEntry('POST', '/users', 200, 10),
    ];
    const scores = scoreRoutes(entries, patterns);
    expect(scores[0].method).toBe('GET');
  });

  it('handles unmatched entries gracefully', () => {
    const entries = [makeEntry('DELETE', '/other', 204)];
    const scores = scoreRoutes(entries, patterns);
    expect(scores.every((s) => s.count === 0)).toBe(true);
  });
});
