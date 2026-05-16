import { buildTrendExtension, applyTrendsToDocument } from './trend-bridge';
import { RouteTrend } from '../traffic/trend';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/items',
    statusCode: 200,
    timestamp: Date.now(),
    durationMs: 80,
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
        get: { responses: {} },
        post: { responses: {} },
      },
    },
  };
}

describe('buildTrendExtension', () => {
  it('includes direction and changePercent', () => {
    const trend: RouteTrend = {
      route: '/api/items',
      method: 'GET',
      direction: 'up',
      changePercent: 25,
      points: [{ timestamp: 1000, count: 10, errorRate: 0.1, avgLatency: 120 }],
    };
    const ext = buildTrendExtension(trend);
    expect(ext['x-routewatch-trend']).toBeDefined();
    const data = ext['x-routewatch-trend'] as any;
    expect(data.direction).toBe('up');
    expect(data.changePercent).toBe(25);
    expect(data.points).toHaveLength(1);
    expect(data.points[0].count).toBe(10);
  });

  it('rounds avgLatency to integer', () => {
    const trend: RouteTrend = {
      route: '/x',
      method: 'GET',
      direction: 'stable',
      changePercent: 0,
      points: [{ timestamp: 0, count: 1, errorRate: 0, avgLatency: 99.7 }],
    };
    const ext = buildTrendExtension(trend) as any;
    expect(ext['x-routewatch-trend'].points[0].avgLatency).toBe(100);
  });
});

describe('applyTrendsToDocument', () => {
  it('attaches trend extension to matching operations', () => {
    const now = Date.now();
    const entries = [
      makeEntry({ timestamp: now }),
      makeEntry({ timestamp: now + 5000 }),
      makeEntry({ timestamp: now + 10000 }),
    ];
    const doc = makeDoc();
    const result = applyTrendsToDocument(doc, entries, 3000);
    const op = result.paths!['/api/items'].get as any;
    expect(op['x-routewatch-trend']).toBeDefined();
  });

  it('does not attach trend to unmatched operations', () => {
    const entries = [makeEntry({ method: 'GET', path: '/api/items' })];
    const doc = makeDoc();
    const result = applyTrendsToDocument(doc, entries);
    const op = result.paths!['/api/items'].post as any;
    expect(op['x-routewatch-trend']).toBeUndefined();
  });

  it('returns document unchanged when no entries', () => {
    const doc = makeDoc();
    const result = applyTrendsToDocument(doc, []);
    expect(result.paths).toEqual(doc.paths);
  });
});
