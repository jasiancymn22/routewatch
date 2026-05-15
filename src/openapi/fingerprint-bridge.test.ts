import { applyFingerprintsToDocument, buildFingerprintExtension } from './fingerprint-bridge';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts/oas30';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/users',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    query: {},
    requestBody: null,
    responseBody: null,
    durationMs: 10,
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

describe('buildFingerprintExtension', () => {
  it('returns fingerprint keys and variant count', () => {
    const entries = [
      makeEntry({ method: 'GET', statusCode: 200 }),
      makeEntry({ method: 'GET', statusCode: 404 }),
    ];
    const ext = buildFingerprintExtension(entries);
    expect(ext['x-variant-count']).toBe(2);
    expect(ext['x-fingerprints']).toHaveLength(2);
  });

  it('deduplicates identical fingerprints', () => {
    const entries = [
      makeEntry({ method: 'GET', statusCode: 200 }),
      makeEntry({ method: 'GET', statusCode: 200 }),
    ];
    const ext = buildFingerprintExtension(entries);
    expect(ext['x-variant-count']).toBe(1);
  });

  it('distinguishes entries by auth header', () => {
    const entries = [
      makeEntry({ requestHeaders: { authorization: 'Bearer token' } }),
      makeEntry({ requestHeaders: {} }),
    ];
    const ext = buildFingerprintExtension(entries);
    expect(ext['x-variant-count']).toBe(2);
  });
});

describe('applyFingerprintsToDocument', () => {
  it('attaches fingerprint extensions to matching operations', () => {
    const doc = makeDoc({
      '/users': { get: { responses: {} } },
    });
    const entries = [makeEntry({ method: 'GET', path: '/users', statusCode: 200 })];
    const result = applyFingerprintsToDocument(doc, entries);
    const op = (result.paths!['/users'] as Record<string, unknown>)['get'] as Record<string, unknown>;
    expect(op['x-variant-count']).toBe(1);
    expect(Array.isArray(op['x-fingerprints'])).toBe(true);
  });

  it('does not modify operations with no matching entries', () => {
    const doc = makeDoc({
      '/users': { get: { responses: {}, operationId: 'listUsers' } },
    });
    const result = applyFingerprintsToDocument(doc, []);
    const op = (result.paths!['/users'] as Record<string, unknown>)['get'] as Record<string, unknown>;
    expect(op['x-variant-count']).toBeUndefined();
  });

  it('returns doc unchanged when paths is missing', () => {
    const doc = makeDoc();
    const result = applyFingerprintsToDocument(doc, [makeEntry()]);
    expect(result).toEqual(doc);
  });
});
