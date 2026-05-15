import { buildHeatmap, flattenHeatmaps, getPeakCell } from './heatmap';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: new Date('2024-01-15T10:00:00Z').toISOString(), // Monday 10:00
    durationMs: 100,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

describe('buildHeatmap', () => {
  it('returns empty array for no entries', () => {
    expect(buildHeatmap([])).toEqual([]);
  });

  it('groups entries by route and time cell', () => {
    const entries = [
      makeEntry({ timestamp: new Date('2024-01-15T10:00:00Z').toISOString(), durationMs: 100 }),
      makeEntry({ timestamp: new Date('2024-01-15T10:30:00Z').toISOString(), durationMs: 200 }),
      makeEntry({ timestamp: new Date('2024-01-15T14:00:00Z').toISOString(), durationMs: 50 }),
    ];
    const result = buildHeatmap(entries);
    expect(result).toHaveLength(1);
    const hm = result[0];
    expect(hm.method).toBe('GET');
    expect(hm.route).toBe('/api/test');
    const hour10Cell = hm.cells.find(c => c.hour === 10);
    expect(hour10Cell?.count).toBe(2);
    expect(hour10Cell?.avgLatency).toBe(150);
  });

  it('separates different routes', () => {
    const entries = [
      makeEntry({ path: '/a' }),
      makeEntry({ path: '/b' }),
    ];
    const result = buildHeatmap(entries);
    expect(result).toHaveLength(2);
  });

  it('separates different methods', () => {
    const entries = [
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'POST' }),
    ];
    const result = buildHeatmap(entries);
    expect(result).toHaveLength(2);
  });
});

describe('getPeakCell', () => {
  it('returns null for empty heatmap', () => {
    expect(getPeakCell({ route: '/a', method: 'GET', cells: [] })).toBeNull();
  });

  it('returns cell with highest count', () => {
    const cells = [
      { hour: 10, day: 1, count: 5, avgLatency: 100 },
      { hour: 14, day: 1, count: 20, avgLatency: 80 },
      { hour: 8, day: 2, count: 3, avgLatency: 50 },
    ];
    const peak = getPeakCell({ route: '/a', method: 'GET', cells });
    expect(peak?.count).toBe(20);
    expect(peak?.hour).toBe(14);
  });
});

describe('flattenHeatmaps', () => {
  it('merges cells across routes', () => {
    const heatmaps = [
      { route: '/a', method: 'GET', cells: [{ hour: 10, day: 1, count: 3, avgLatency: 100 }] },
      { route: '/b', method: 'POST', cells: [{ hour: 10, day: 1, count: 7, avgLatency: 200 }] },
    ];
    const result = flattenHeatmaps(heatmaps);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(10);
    expect(result[0].avgLatency).toBe(170);
  });

  it('returns empty array for no heatmaps', () => {
    expect(flattenHeatmaps([])).toEqual([]);
  });
});
