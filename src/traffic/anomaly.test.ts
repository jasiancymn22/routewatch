import { detectAnomalies, groupAnomaliesByRoute } from './anomaly';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    durationMs: 100,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    requestBody: undefined,
    responseBody: undefined,
    ...overrides,
  };
}

function makeEntries(count: number, overrides: Partial<TrafficEntry> = {}): TrafficEntry[] {
  return Array.from({ length: count }, () => makeEntry(overrides));
}

describe('detectAnomalies', () => {
  it('returns empty array when no anomalies', () => {
    const entries = makeEntries(10, { durationMs: 100 });
    const result = detectAnomalies(entries, entries);
    expect(result).toEqual([]);
  });

  it('detects latency spike', () => {
    const baseline = makeEntries(10, { method: 'GET', path: '/api/slow', durationMs: 100 });
    const current = makeEntries(10, { method: 'GET', path: '/api/slow', durationMs: 400 });
    const result = detectAnomalies(current, baseline);
    const spike = result.find(a => a.type === 'latency_spike');
    expect(spike).toBeDefined();
    expect(spike?.route).toBe('/api/slow');
    expect(spike?.value).toBe(400);
  });

  it('detects error surge', () => {
    const baseline = makeEntries(10, { method: 'POST', path: '/api/submit', statusCode: 200 });
    const current = [
      ...makeEntries(2, { method: 'POST', path: '/api/submit', statusCode: 200 }),
      ...makeEntries(8, { method: 'POST', path: '/api/submit', statusCode: 500 }),
    ];
    const result = detectAnomalies(current, baseline);
    const surge = result.find(a => a.type === 'error_surge');
    expect(surge).toBeDefined();
    expect(surge?.severity).toBe('high');
  });

  it('detects traffic drop', () => {
    const baseline = makeEntries(100, { method: 'GET', path: '/api/popular' });
    const current = makeEntries(5, { method: 'GET', path: '/api/popular' });
    const result = detectAnomalies(current, baseline);
    const drop = result.find(a => a.type === 'traffic_drop');
    expect(drop).toBeDefined();
    expect(drop?.value).toBe(5);
  });

  it('detects traffic spike', () => {
    const baseline = makeEntries(10, { method: 'GET', path: '/api/viral' });
    const current = makeEntries(50, { method: 'GET', path: '/api/viral' });
    const result = detectAnomalies(current, baseline);
    const spike = result.find(a => a.type === 'traffic_spike');
    expect(spike).toBeDefined();
  });

  it('respects custom thresholds', () => {
    const baseline = makeEntries(10, { method: 'GET', path: '/api/test', durationMs: 100 });
    const current = makeEntries(10, { method: 'GET', path: '/api/test', durationMs: 180 });
    const noAnomaly = detectAnomalies(current, baseline);
    expect(noAnomaly.filter(a => a.type === 'latency_spike')).toHaveLength(0);
    const withLowThreshold = detectAnomalies(current, baseline, { latencyMultiplier: 1.5 });
    expect(withLowThreshold.filter(a => a.type === 'latency_spike')).toHaveLength(1);
  });
});

describe('groupAnomaliesByRoute', () => {
  it('groups anomalies by method and route', () => {
    const baseline = makeEntries(10, { method: 'GET', path: '/api/test', durationMs: 50 });
    const current = [
      ...makeEntries(10, { method: 'GET', path: '/api/test', durationMs: 300 }),
      ...makeEntries(2, { method: 'GET', path: '/api/test', statusCode: 200 }),
      ...makeEntries(8, { method: 'GET', path: '/api/test', statusCode: 500 }),
    ];
    const anomalies = detectAnomalies(current, baseline);
    const grouped = groupAnomaliesByRoute(anomalies);
    expect(Object.keys(grouped)).toContain('GET:/api/test');
  });
});
