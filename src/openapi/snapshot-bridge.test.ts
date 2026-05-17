import { buildSnapshotExtension, applySnapshotToDocument } from './snapshot-bridge';
import { createSnapshot, TrafficSnapshot } from '../traffic/snapshot';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    durationMs: 50,
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    ...overrides,
  };
}

function makeDoc(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '0.0.1' },
    paths: {},
  };
}

describe('buildSnapshotExtension', () => {
  it('returns correct field values', () => {
    const snapshot = createSnapshot([
      makeEntry({ path: '/a', method: 'GET' }),
      makeEntry({ path: '/b', method: 'POST' }),
    ]);
    const ext = buildSnapshotExtension(snapshot);
    expect(ext.entryCount).toBe(2);
    expect(ext.routeCount).toBe(2);
    expect(ext.routes).toContain('GET:/a');
    expect(typeof ext.capturedAt).toBe('string');
  });

  it('capturedAt is a valid ISO date string', () => {
    const snapshot = createSnapshot([]);
    const ext = buildSnapshotExtension(snapshot);
    expect(() => new Date(ext.capturedAt)).not.toThrow();
    expect(new Date(ext.capturedAt).toISOString()).toBe(ext.capturedAt);
  });
});

describe('applySnapshotToDocument', () => {
  it('attaches x-snapshot to info', () => {
    const snapshot = createSnapshot([makeEntry()]);
    const doc = makeDoc();
    const result = applySnapshotToDocument(doc, snapshot);
    expect((result.info as any)['x-snapshot']).toBeDefined();
    expect((result.info as any)['x-snapshot'].entryCount).toBe(1);
  });

  it('does not mutate the original document', () => {
    const snapshot = createSnapshot([makeEntry()]);
    const doc = makeDoc();
    applySnapshotToDocument(doc, snapshot);
    expect((doc.info as any)['x-snapshot']).toBeUndefined();
  });

  it('preserves existing info fields', () => {
    const snapshot = createSnapshot([]);
    const doc = makeDoc();
    const result = applySnapshotToDocument(doc, snapshot);
    expect(result.info.title).toBe('Test');
    expect(result.info.version).toBe('0.0.1');
  });
});
