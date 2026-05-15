import { buildHeatmapExtension, applyHeatmapToDocument } from './heatmap-bridge';
import { RouteHeatmap } from '../traffic/heatmap';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts/oas30';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/items',
    statusCode: 200,
    timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
    durationMs: 120,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

function makeDoc(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/api/items': {
        get: { responses: { '200': { description: 'OK' } } },
      },
    },
  };
}

describe('buildHeatmapExtension', () => {
  it('returns null for empty heatmap', () => {
    const hm: RouteHeatmap = { route: '/a', method: 'GET', cells: [] };
    expect(buildHeatmapExtension(hm)).toBeNull();
  });

  it('includes peak and cells in extension', () => {
    const hm: RouteHeatmap = {
      route: '/a',
      method: 'GET',
      cells: [
        { hour: 9, day: 1, count: 2, avgLatency: 80 },
        { hour: 14, day: 3, count: 10, avgLatency: 150.7 },
      ],
    };
    const ext = buildHeatmapExtension(hm);
    expect(ext).not.toBeNull();
    expect(ext!['x-heatmap'].peakHour).toBe(14);
    expect(ext!['x-heatmap'].peakCount).toBe(10);
    expect(ext!['x-heatmap'].cells).toHaveLength(2);
    expect(ext!['x-heatmap'].cells[1].avgLatency).toBe(151);
  });
});

describe('applyHeatmapToDocument', () => {
  it('does not mutate doc with no matching entries', () => {
    const doc = makeDoc();
    const result = applyHeatmapToDocument(doc, []);
    expect((result.paths!['/api/items']?.get as any)?.['x-heatmap']).toBeUndefined();
  });

  it('attaches x-heatmap to matching operations', () => {
    const entries = [
      makeEntry({ timestamp: new Date('2024-01-15T10:00:00Z').toISOString() }),
      makeEntry({ timestamp: new Date('2024-01-15T10:30:00Z').toISOString() }),
    ];
    const doc = makeDoc();
    const result = applyHeatmapToDocument(doc, entries);
    const op = result.paths!['/api/items']?.get as any;
    expect(op['x-heatmap']).toBeDefined();
    expect(op['x-heatmap'].peakCount).toBe(2);
  });

  it('sets global heatmap extension on doc', () => {
    const entries = [makeEntry()];
    const doc = makeDoc();
    const result = applyHeatmapToDocument(doc, entries) as any;
    expect(result['x-global-heatmap']).toBeDefined();
    expect(result['x-global-heatmap'].totalCells).toBeGreaterThan(0);
  });
});
