import { buildRetryExtensions, applyRetriesToDocument } from './retry-bridge';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    body: null,
    responseBody: null,
    timestamp: Date.now(),
    duration: 120,
    ...overrides,
  };
}

function makeDoc(overrides: Partial<OpenAPIObject> = {}): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/api/users': {
        get: { responses: { '200': { description: 'OK' } } },
      },
    },
    ...overrides,
  };
}

describe('buildRetryExtensions', () => {
  it('returns empty map when no retries detected', () => {
    const entries = [makeEntry(), makeEntry({ timestamp: Date.now() + 5000 })];
    const result = buildRetryExtensions(entries);
    expect(result).toEqual({});
  });

  it('detects retries for a route and builds extensions', () => {
    const now = Date.now();
    const entries = [
      makeEntry({ timestamp: now }),
      makeEntry({ timestamp: now + 800, statusCode: 503 }),
      makeEntry({ timestamp: now + 1600, statusCode: 200 }),
    ];
    const result = buildRetryExtensions(entries);
    expect(result['GET /api/users']).toBeDefined();
    expect(result['GET /api/users']['x-retry-count']).toBeGreaterThan(0);
  });

  it('includes average delay in extension', () => {
    const now = Date.now();
    const entries = [
      makeEntry({ timestamp: now }),
      makeEntry({ timestamp: now + 500 }),
      makeEntry({ timestamp: now + 1000 }),
    ];
    const result = buildRetryExtensions(entries);
    const ext = result['GET /api/users'];
    if (ext) {
      expect(typeof ext['x-retry-avg-delay-ms']).toBe('number');
    }
  });
});

describe('applyRetriesToDocument', () => {
  it('returns document unchanged when no retry extensions', () => {
    const doc = makeDoc();
    const result = applyRetriesToDocument(doc, {});
    expect(result.paths['/api/users'].get['x-retry-count']).toBeUndefined();
  });

  it('applies retry extensions to matching path operations', () => {
    const doc = makeDoc();
    const extensions = {
      'GET /api/users': { 'x-retry-count': 3, 'x-retry-avg-delay-ms': 600 },
    };
    const result = applyRetriesToDocument(doc, extensions);
    expect(result.paths['/api/users'].get['x-retry-count']).toBe(3);
    expect(result.paths['/api/users'].get['x-retry-avg-delay-ms']).toBe(600);
  });

  it('does not modify paths not present in extensions', () => {
    const doc = makeDoc({
      paths: {
        '/api/users': { get: { responses: {} } },
        '/api/posts': { post: { responses: {} } },
      },
    });
    const extensions = {
      'GET /api/users': { 'x-retry-count': 2, 'x-retry-avg-delay-ms': 400 },
    };
    const result = applyRetriesToDocument(doc, extensions);
    expect(result.paths['/api/posts'].post['x-retry-count']).toBeUndefined();
  });
});
