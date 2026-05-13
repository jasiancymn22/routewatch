import { buildOpenAPIDocument } from './builder';
import { TrafficEntry } from '../traffic/types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/users',
    normalizedPath: '/users',
    statusCode: 200,
    requestBody: null,
    responseBody: { id: 1, name: 'Alice' },
    query: {},
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('buildOpenAPIDocument', () => {
  it('returns a valid OpenAPI 3.0.3 document', () => {
    const entries = new Map([['GET /users', [makeEntry()]]]);
    const doc = buildOpenAPIDocument(entries);
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.info.title).toBe('RouteWatch API');
  });

  it('uses custom title and version from options', () => {
    const entries = new Map([['GET /users', [makeEntry()]]]);
    const doc = buildOpenAPIDocument(entries, { title: 'My API', version: '2.0.0' });
    expect(doc.info.title).toBe('My API');
    expect(doc.info.version).toBe('2.0.0');
  });

  it('creates a path entry for each route', () => {
    const entries = new Map([
      ['GET /users', [makeEntry()]],
      ['POST /users', [makeEntry({ method: 'POST', statusCode: 201, requestBody: { name: 'Bob' } })]],
    ]);
    const doc = buildOpenAPIDocument(entries);
    expect(doc.paths['/users']).toBeDefined();
    expect(doc.paths['/users']['get']).toBeDefined();
    expect(doc.paths['/users']['post']).toBeDefined();
  });

  it('generates response objects with correct status codes', () => {
    const entries = new Map([
      ['GET /items', [makeEntry({ path: '/items', normalizedPath: '/items', statusCode: 200 })]],
    ]);
    const doc = buildOpenAPIDocument(entries);
    expect(doc.paths['/items']['get'].responses['200']).toBeDefined();
    expect(doc.paths['/items']['get'].responses['200'].description).toBe('HTTP 200');
  });

  it('generates query parameters when query data is present', () => {
    const entries = new Map([
      ['GET /search', [makeEntry({ path: '/search', normalizedPath: '/search', query: { q: 'hello', limit: '10' } })]],
    ]);
    const doc = buildOpenAPIDocument(entries);
    const params = doc.paths['/search']['get'].parameters ?? [];
    const names = params.map((p) => p.name);
    expect(names).toContain('q');
    expect(names).toContain('limit');
  });

  it('generates requestBody when POST has body', () => {
    const entry = makeEntry({ method: 'POST', statusCode: 201, requestBody: { email: 'a@b.com' } });
    const entries = new Map([['POST /signup', [entry]]]);
    const doc = buildOpenAPIDocument(entries);
    expect(doc.paths['/signup']['post'].requestBody).toBeDefined();
  });

  it('skips paths with malformed route keys', () => {
    const entries = new Map([['BADKEY', [makeEntry()]]]);
    const doc = buildOpenAPIDocument(entries);
    expect(Object.keys(doc.paths)).toHaveLength(0);
  });
});
