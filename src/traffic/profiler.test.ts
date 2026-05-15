import { profileRoute, profileEntries, RouteProfile } from './profiler';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    duration: 100,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

describe('profileRoute', () => {
  it('returns zero values for empty entries', () => {
    const profile = profileRoute('GET', '/api/test', []);
    expect(profile.avgDuration).toBe(0);
    expect(profile.sampleCount).toBe(0);
    expect(profile.p95).toBe(0);
  });

  it('computes correct stats for single entry', () => {
    const profile = profileRoute('GET', '/api/test', [makeEntry({ duration: 200 })]);
    expect(profile.avgDuration).toBe(200);
    expect(profile.minDuration).toBe(200);
    expect(profile.maxDuration).toBe(200);
    expect(profile.p50).toBe(200);
    expect(profile.sampleCount).toBe(1);
  });

  it('computes percentiles correctly', () => {
    const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const entries = durations.map((d) => makeEntry({ duration: d }));
    const profile = profileRoute('GET', '/api/test', entries);
    expect(profile.minDuration).toBe(10);
    expect(profile.maxDuration).toBe(100);
    expect(profile.p50).toBe(50);
    expect(profile.p95).toBe(95);
    expect(profile.sampleCount).toBe(10);
  });

  it('sets method and path correctly', () => {
    const profile = profileRoute('POST', '/api/users', [makeEntry()]);
    expect(profile.method).toBe('POST');
    expect(profile.path).toBe('/api/users');
  });
});

describe('profileEntries', () => {
  it('groups entries by method and path', () => {
    const entries = [
      makeEntry({ method: 'GET', path: '/a', duration: 10 }),
      makeEntry({ method: 'GET', path: '/a', duration: 20 }),
      makeEntry({ method: 'POST', path: '/b', duration: 50 }),
    ];
    const result = profileEntries(entries);
    expect(result.routes).toHaveLength(2);
    expect(result.totalRequests).toBe(3);
  });

  it('returns generatedAt timestamp', () => {
    const before = Date.now();
    const result = profileEntries([makeEntry()]);
    expect(result.generatedAt).toBeGreaterThanOrEqual(before);
  });

  it('handles empty entries', () => {
    const result = profileEntries([]);
    expect(result.routes).toHaveLength(0);
    expect(result.totalRequests).toBe(0);
  });
});
