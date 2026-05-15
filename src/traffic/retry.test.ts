import { groupRetries, detectRetries, retryStats, retryKey } from './retry';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    body: null,
    responseBody: null,
    duration: 50,
    ...overrides,
  };
}

const NOW = 1700000000000;

describe('retryKey', () => {
  it('combines method and path', () => {
    const entry = makeEntry({ method: 'POST', path: '/users' });
    expect(retryKey(entry)).toBe('POST:/users');
  });
});

describe('groupRetries', () => {
  it('returns empty array when no retries', () => {
    const entries = [
      makeEntry({ timestamp: NOW }),
      makeEntry({ path: '/other', timestamp: NOW + 100 }),
    ];
    expect(groupRetries(entries)).toHaveLength(0);
  });

  it('groups entries with same key within window', () => {
    const entries = [
      makeEntry({ statusCode: 500, timestamp: NOW }),
      makeEntry({ statusCode: 500, timestamp: NOW + 1000 }),
      makeEntry({ statusCode: 200, timestamp: NOW + 2000 }),
    ];
    const groups = groupRetries(entries, 5000);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].retryCount).toBeGreaterThan(0);
  });

  it('detects success after retry', () => {
    const entries = [
      makeEntry({ statusCode: 503, timestamp: NOW }),
      makeEntry({ statusCode: 200, timestamp: NOW + 500 }),
    ];
    const groups = groupRetries(entries, 5000);
    expect(groups.some((g) => g.successAfterRetry)).toBe(true);
  });

  it('excludes entries outside window', () => {
    const entries = [
      makeEntry({ statusCode: 500, timestamp: NOW }),
      makeEntry({ statusCode: 200, timestamp: NOW + 60000 }),
    ];
    const groups = groupRetries(entries, 5000);
    expect(groups).toHaveLength(0);
  });
});

describe('detectRetries', () => {
  it('returns entries that are part of retry groups', () => {
    const entries = [
      makeEntry({ statusCode: 500, timestamp: NOW }),
      makeEntry({ statusCode: 200, timestamp: NOW + 1000 }),
      makeEntry({ path: '/other', timestamp: NOW }),
    ];
    const retried = detectRetries(entries, 5000);
    expect(retried.every((e) => e.path === '/api/test')).toBe(true);
  });
});

describe('retryStats', () => {
  it('computes retry count and success rate', () => {
    const entries = [
      makeEntry({ statusCode: 500, timestamp: NOW }),
      makeEntry({ statusCode: 200, timestamp: NOW + 500 }),
    ];
    const stats = retryStats(entries, 5000);
    const key = 'GET:/api/test';
    expect(stats[key]).toBeDefined();
    expect(stats[key].retries).toBeGreaterThan(0);
    expect(stats[key].successRate).toBeGreaterThan(0);
  });
});
