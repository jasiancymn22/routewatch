import { applyRatesToDocument, buildRateExtensions } from './rate-bridge';
import { OpenAPIObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { computeRateMap } from '../traffic/rate';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/items',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    ...overrides,
  };
}

function makeDoc(overrides: Partial<OpenAPIObject> = {}): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/api/items': {
        get: { responses: { '200': { description: 'OK' } } },
      },
    },
    ...overrides,
  };
}

describe('buildRateExtensions', () => {
  it('returns empty object for unknown route', () => {
    const rateMap = computeRateMap([], 60_000);
    const ext = buildRateExtensions('GET', '/unknown', rateMap);
    expect(ext).toEqual({});
  });

  it('returns rate extensions for known route', () => {
    const entries = [
      makeEntry({ timestamp: 0 }),
      makeEntry({ timestamp: 1000 }),
      makeEntry({ timestamp: 2000 }),
    ];
    const rateMap = computeRateMap(entries, 60_000);
    const ext = buildRateExtensions('GET', '/api/items', rateMap);
    expect(ext['x-request-rate']).toBeGreaterThan(0);
    expect(ext['x-rate-window-ms']).toBe(60_000);
  });
});

describe('applyRatesToDocument', () => {
  it('attaches rate extensions to matching operations', () => {
    const entries = [
      makeEntry({ timestamp: 0 }),
      makeEntry({ timestamp: 500 }),
    ];
    const doc = makeDoc();
    const result = applyRatesToDocument(doc, entries, 60_000);
    const op = result.paths?.['/api/items']?.get as Record<string, unknown>;
    expect(op['x-request-rate']).toBeDefined();
    expect(op['x-rate-window-ms']).toBe(60_000);
  });

  it('does not modify operations with no matching traffic', () => {
    const doc = makeDoc();
    const result = applyRatesToDocument(doc, [], 60_000);
    const op = result.paths?.['/api/items']?.get as Record<string, unknown>;
    expect(op['x-request-rate']).toBeUndefined();
  });

  it('preserves existing operation fields', () => {
    const entries = [makeEntry({ timestamp: 0 })];
    const doc = makeDoc();
    const result = applyRatesToDocument(doc, entries);
    const op = result.paths?.['/api/items']?.get as Record<string, unknown>;
    expect(op['responses']).toBeDefined();
  });
});
