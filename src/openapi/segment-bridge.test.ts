import { buildSegmentExtension, applySegmentsToDocument } from './segment-bridge';
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
    durationMs: 30,
    ...overrides,
  };
}

function makeDoc(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
  };
}

describe('buildSegmentExtension', () => {
  it('counts entries by segment', () => {
    const entries = [
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 404 }),
      makeEntry({ statusCode: 500 }),
    ];
    const ext = buildSegmentExtension(entries);
    expect(ext['x-segment-counts']['success']).toBe(2);
    expect(ext['x-segment-counts']['client-error']).toBe(1);
    expect(ext['x-segment-counts']['server-error']).toBe(1);
  });

  it('omits segments with zero count', () => {
    const entries = [makeEntry({ statusCode: 200 })];
    const ext = buildSegmentExtension(entries);
    expect(ext['x-segment-counts']['client-error']).toBeUndefined();
  });

  it('includes rule names', () => {
    const ext = buildSegmentExtension([]);
    expect(ext['x-segment-rules']).toContain('success');
    expect(ext['x-segment-rules']).toContain('server-error');
  });

  it('supports custom rules', () => {
    const rules = [{ name: 'fast', match: (e: TrafficEntry) => e.durationMs < 100 }];
    const ext = buildSegmentExtension([makeEntry({ durationMs: 50 })], rules);
    expect(ext['x-segment-counts']['fast']).toBe(1);
  });
});

describe('applySegmentsToDocument', () => {
  it('merges segment extension into doc info', () => {
    const doc = makeDoc();
    const entries = [makeEntry({ statusCode: 200 })];
    const result = applySegmentsToDocument(doc, entries);
    expect((result.info as any)['x-segment-counts']['success']).toBe(1);
  });

  it('does not mutate original document', () => {
    const doc = makeDoc();
    applySegmentsToDocument(doc, []);
    expect((doc.info as any)['x-segment-counts']).toBeUndefined();
  });
});
