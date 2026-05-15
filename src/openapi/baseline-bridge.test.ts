import { applyBaselineToDocument, buildBaselineExtension } from './baseline-bridge';
import { TrafficEntry } from '../traffic/types';
import { computeBaseline } from '../traffic/baseline';
import { OpenAPIObject } from 'openapi3-ts';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    durationMs: 100,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    query: {},
    ...overrides,
  };
}

function makeDoc(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/api/users': {
        get: { responses: {} },
      },
    },
  };
}

describe('buildBaselineExtension', () => {
  it('computes baseline stats per route', () => {
    const entries = [makeEntry(), makeEntry({ durationMs: 200 })];
    const ext = buildBaselineExtension(entries);
    expect(ext['GET:/api/users']).toBeDefined();
    expect(ext['GET:/api/users'].avgLatency).toBe(150);
    expect(ext['GET:/api/users'].requestCount).toBe(2);
    expect(ext['GET:/api/users'].errorRate).toBe(0);
  });

  it('detects latency regression against prior baseline', () => {
    const priorEntries = [makeEntry({ durationMs: 50 })];
    const prior = computeBaseline(priorEntries);
    const currentEntries = [makeEntry({ durationMs: 500 })];
    const ext = buildBaselineExtension(currentEntries, prior);
    expect(ext['GET:/api/users'].regressions?.latency).toBe(true);
  });

  it('detects error rate regression against prior baseline', () => {
    const priorEntries = [makeEntry()];
    const prior = computeBaseline(priorEntries);
    const currentEntries = [makeEntry({ statusCode: 500 }), makeEntry({ statusCode: 500 })];
    const ext = buildBaselineExtension(currentEntries, prior);
    expect(ext['GET:/api/users'].regressions?.errorRate).toBe(true);
  });

  it('returns no regressions when no prior baseline', () => {
    const entries = [makeEntry()];
    const ext = buildBaselineExtension(entries);
    expect(ext['GET:/api/users'].regressions).toBeUndefined();
  });
});

describe('applyBaselineToDocument', () => {
  it('attaches x-baseline extension to matching operations', () => {
    const doc = makeDoc();
    const entries = [makeEntry(), makeEntry({ durationMs: 300 })];
    const result = applyBaselineToDocument(doc, entries);
    const op = result.paths?.['/api/users']?.get as Record<string, unknown>;
    expect(op['x-baseline']).toBeDefined();
    expect((op['x-baseline'] as { requestCount: number }).requestCount).toBe(2);
  });

  it('does not modify operations with no matching traffic', () => {
    const doc: OpenAPIObject = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: { '/other': { get: { responses: {} } } },
    };
    const entries = [makeEntry()];
    const result = applyBaselineToDocument(doc, entries);
    const op = result.paths?.['/other']?.get as Record<string, unknown>;
    expect(op['x-baseline']).toBeUndefined();
  });
});
