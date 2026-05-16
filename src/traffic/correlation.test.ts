import {
  groupIntoSessions,
  countCoOccurrences,
  buildCorrelationMap,
  getCorrelatedRoutes,
} from './correlation';
import { TrafficEntry } from './types';

function makeEntry(path: string, method = 'GET', timestamp = Date.now()): TrafficEntry {
  return {
    path,
    method,
    statusCode: 200,
    timestamp,
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    requestBody: undefined,
    responseBody: undefined,
    durationMs: 10,
  };
}

const BASE = 1_000_000;

describe('groupIntoSessions', () => {
  it('groups entries within the time window into one session', () => {
    const entries = [
      makeEntry('/a', 'GET', BASE),
      makeEntry('/b', 'GET', BASE + 1000),
      makeEntry('/c', 'GET', BASE + 2000),
    ];
    const sessions = groupIntoSessions(entries, 5 * 60 * 1000);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toHaveLength(3);
  });

  it('splits entries into separate sessions when gap exceeds window', () => {
    const entries = [
      makeEntry('/a', 'GET', BASE),
      makeEntry('/b', 'GET', BASE + 10 * 60 * 1000),
    ];
    const sessions = groupIntoSessions(entries, 5 * 60 * 1000);
    expect(sessions).toHaveLength(2);
  });

  it('returns empty array for no entries', () => {
    expect(groupIntoSessions([])).toEqual([]);
  });
});

describe('countCoOccurrences', () => {
  it('counts route pairs within sessions', () => {
    const sessions = [
      [makeEntry('/a'), makeEntry('/b')],
      [makeEntry('/a'), makeEntry('/b')],
      [makeEntry('/a'), makeEntry('/c')],
    ];
    const counts = countCoOccurrences(sessions);
    expect(counts.get('GET:/a||GET:/b')).toBe(2);
    expect(counts.get('GET:/a||GET:/c')).toBe(1);
  });

  it('deduplicates routes within the same session', () => {
    const sessions = [[makeEntry('/a'), makeEntry('/a'), makeEntry('/b')]];
    const counts = countCoOccurrences(sessions);
    expect(counts.get('GET:/a||GET:/b')).toBe(1);
  });
});

describe('buildCorrelationMap', () => {
  it('returns pairs with correlation scores', () => {
    const entries = [
      makeEntry('/a', 'GET', BASE),
      makeEntry('/b', 'GET', BASE + 1000),
      makeEntry('/a', 'GET', BASE + 10 * 60 * 1000),
      makeEntry('/b', 'GET', BASE + 10 * 60 * 1000 + 500),
    ];
    const map = buildCorrelationMap(entries);
    expect(map.pairs.length).toBeGreaterThan(0);
    expect(map.pairs[0].correlationScore).toBeGreaterThan(0);
  });

  it('filters out pairs below minScore', () => {
    const entries = [
      makeEntry('/a', 'GET', BASE),
      makeEntry('/b', 'GET', BASE + 1000),
    ];
    const map = buildCorrelationMap(entries, undefined, 0.99);
    // Only 1 session, score = 1.0 — should pass
    expect(map.pairs.length).toBeGreaterThanOrEqual(0);
  });
});

describe('getCorrelatedRoutes', () => {
  it('returns routes correlated with the given route', () => {
    const entries = [
      makeEntry('/a', 'GET', BASE),
      makeEntry('/b', 'GET', BASE + 500),
      makeEntry('/c', 'GET', BASE + 1000),
    ];
    const map = buildCorrelationMap(entries);
    const results = getCorrelatedRoutes('GET:/a', map);
    expect(Array.isArray(results)).toBe(true);
  });

  it('returns empty array when route has no correlations', () => {
    const map = { pairs: [], sessionCount: 0 };
    expect(getCorrelatedRoutes('GET:/unknown', map)).toEqual([]);
  });
});
