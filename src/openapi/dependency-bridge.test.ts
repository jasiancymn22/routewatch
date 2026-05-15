import { buildDependencyExtension, applyDependenciesToDocument } from './dependency-bridge';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts';

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

function makeDoc(paths: Record<string, unknown> = {}): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths,
  } as OpenAPIObject;
}

describe('buildDependencyExtension', () => {
  it('returns extension with dependency list', () => {
    const deps = [{ from: 'GET:/a', to: 'GET:/b', count: 2, avgGapMs: 100 }];
    const ext = buildDependencyExtension(deps);
    expect(ext['x-routewatch-dependencies']).toHaveLength(1);
    expect((ext['x-routewatch-dependencies'] as unknown[])[0]).toMatchObject({
      from: 'GET:/a',
      to: 'GET:/b',
      count: 2,
    });
  });

  it('returns empty array for no deps', () => {
    const ext = buildDependencyExtension([]);
    expect(ext['x-routewatch-dependencies']).toEqual([]);
  });
});

describe('applyDependenciesToDocument', () => {
  it('attaches x-routewatch-leads-to to operations', () => {
    const now = 1000;
    const entries = [
      makeEntry({ path: '/api/users', method: 'GET', timestamp: now }),
      makeEntry({ path: '/api/orders', method: 'GET', timestamp: now + 100 }),
    ];
    const doc = makeDoc({
      '/api/users': { get: { summary: 'List users', responses: {} } },
      '/api/orders': { get: { summary: 'List orders', responses: {} } },
    });
    const result = applyDependenciesToDocument(doc, entries, 500);
    const op = (result.paths['/api/users'] as Record<string, unknown>)['get'] as Record<string, unknown>;
    expect(op['x-routewatch-leads-to']).toBeDefined();
    const leads = op['x-routewatch-leads-to'] as Array<{ route: string }>;
    expect(leads[0].route).toBe('GET:/api/orders');
  });

  it('adds global dependency extension to info', () => {
    const now = 1000;
    const entries = [
      makeEntry({ path: '/api/a', timestamp: now }),
      makeEntry({ path: '/api/b', timestamp: now + 50 }),
    ];
    const doc = makeDoc();
    const result = applyDependenciesToDocument(doc, entries, 500);
    expect(result.info['x-routewatch-dependencies']).toBeDefined();
  });

  it('returns document unchanged when no entries', () => {
    const doc = makeDoc({ '/api/a': { get: { responses: {} } } });
    const result = applyDependenciesToDocument(doc, [], 500);
    expect(result.paths).toEqual(doc.paths);
  });
});
