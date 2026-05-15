import { collectTagsFromEntries, applyTagsToDocument } from './tag-bridge';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts/oas31';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/items',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    durationMs: 100,
    ...overrides,
  } as TrafficEntry;
}

function makeDoc(overrides: Partial<OpenAPIObject> = {}): OpenAPIObject {
  return {
    openapi: '3.1.0',
    info: { title: 'Test API', version: '0.1.0' },
    paths: {
      '/api/items': {
        get: { responses: { '200': { description: 'OK' } } },
        post: { responses: { '201': { description: 'Created' } } },
      },
    },
    ...overrides,
  };
}

describe('collectTagsFromEntries', () => {
  it('collects tags from entries using builtin rules', () => {
    const entries = [
      makeEntry({ method: 'GET', statusCode: 200 }),
      makeEntry({ method: 'POST', statusCode: 500 }),
    ];
    const tags = collectTagsFromEntries(entries);
    expect(tags).toContain('read');
    expect(tags).toContain('error');
    expect(tags).toContain('mutation');
  });

  it('returns empty array for no entries', () => {
    expect(collectTagsFromEntries([])).toEqual([]);
  });

  it('uses custom rules when provided', () => {
    const entries = [makeEntry({ path: '/admin/users' })];
    const rules = [{ tag: 'admin', match: (e: TrafficEntry) => e.path.startsWith('/admin') }];
    const tags = collectTagsFromEntries(entries, rules);
    expect(tags).toEqual(['admin']);
  });
});

describe('applyTagsToDocument', () => {
  it('adds top-level tags to document', () => {
    const entries = [makeEntry({ method: 'GET', statusCode: 200 })];
    const doc = makeDoc();
    const result = applyTagsToDocument(doc, entries);
    expect(result.tags?.some((t) => t.name === 'read')).toBe(true);
  });

  it('does not duplicate existing top-level tags', () => {
    const entries = [makeEntry({ method: 'GET', statusCode: 200 })];
    const doc = makeDoc({ tags: [{ name: 'read' }] });
    const result = applyTagsToDocument(doc, entries);
    const readTags = result.tags?.filter((t) => t.name === 'read') ?? [];
    expect(readTags).toHaveLength(1);
  });

  it('applies tags to matching operations', () => {
    const entries = [makeEntry({ method: 'POST', statusCode: 500, path: '/api/items' })];
    const doc = makeDoc();
    const result = applyTagsToDocument(doc, entries);
    const postOp = result.paths?.['/api/items']?.post as { tags?: string[] };
    expect(postOp?.tags).toContain('error');
    expect(postOp?.tags).toContain('mutation');
  });

  it('returns document unchanged if no paths', () => {
    const entries = [makeEntry()];
    const doc: OpenAPIObject = { openapi: '3.1.0', info: { title: 'T', version: '1' } };
    const result = applyTagsToDocument(doc, entries);
    expect(result.paths).toBeUndefined();
  });
});
