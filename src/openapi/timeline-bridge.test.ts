import { buildTimelineExtension, applyTimelineToDocument } from './timeline-bridge';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts';

const BASE = 2_000_000;

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/items',
    statusCode: 200,
    timestamp: BASE,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: undefined,
    responseBody: undefined,
    durationMs: 5,
    ...overrides,
  };
}

function makeDoc(paths: Record<string, object> = {}): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '0.0.1' },
    paths,
  };
}

describe('buildTimelineExtension', () => {
  it('returns zeros for empty entries', () => {
    const ext = buildTimelineExtension([]);
    expect(ext.totalRequests).toBe(0);
    expect(ext.totalErrors).toBe(0);
    expect(ext.bucketCount).toBe(0);
  });

  it('counts total requests', () => {
    const entries = [makeEntry(), makeEntry(), makeEntry({ statusCode: 500 })];
    const ext = buildTimelineExtension(entries, 60_000);
    expect(ext.totalRequests).toBe(3);
    expect(ext.totalErrors).toBe(1);
  });

  it('sets bucketSizeMs from argument', () => {
    const ext = buildTimelineExtension([makeEntry()], 30_000);
    expect(ext.bucketSizeMs).toBe(30_000);
  });
});

describe('applyTimelineToDocument', () => {
  it('attaches timeline extension to info', () => {
    const doc = makeDoc();
    const result = applyTimelineToDocument(doc, [makeEntry()]);
    expect((result.info as any)['x-routewatch-timeline']).toBeDefined();
    expect((result.info as any)['x-routewatch-timeline'].totalRequests).toBe(1);
  });

  it('attaches per-route timeline to matching paths', () => {
    const doc = makeDoc({ '/api/items': { get: {} } });
    const entries = [makeEntry(), makeEntry({ path: '/api/other' })];
    const result = applyTimelineToDocument(doc, entries);
    const pathItem = result.paths!['/api/items'] as any;
    expect(pathItem['x-routewatch-timeline']).toBeDefined();
    expect(pathItem['x-routewatch-timeline'].totalRequests).toBe(1);
  });

  it('does not mutate the original document', () => {
    const doc = makeDoc({ '/api/items': {} });
    const original = JSON.stringify(doc);
    applyTimelineToDocument(doc, [makeEntry()]);
    expect(JSON.stringify(doc)).toBe(original);
  });
});
