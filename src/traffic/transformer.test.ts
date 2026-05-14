import { redactHeaders, redactBodyFields, truncateBody, transformEntry, transformEntries } from './transformer';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: { authorization: 'Bearer token123', 'content-type': 'application/json' },
    responseHeaders: { 'set-cookie': 'session=abc', 'x-request-id': '1' },
    requestBody: { password: 'secret', name: 'Alice' },
    responseBody: { id: 1 },
    ...overrides,
  };
}

describe('redactHeaders', () => {
  it('redacts default sensitive headers', () => {
    const result = redactHeaders({ authorization: 'Bearer xyz', 'content-type': 'application/json' });
    expect(result['authorization']).toBe('[REDACTED]');
    expect(result['content-type']).toBe('application/json');
  });

  it('redacts custom header list', () => {
    const result = redactHeaders({ 'x-custom': 'secret', other: 'ok' }, ['x-custom']);
    expect(result['x-custom']).toBe('[REDACTED]');
    expect(result['other']).toBe('ok');
  });

  it('is case-insensitive', () => {
    const result = redactHeaders({ Authorization: 'token' });
    expect(result['Authorization']).toBe('[REDACTED]');
  });
});

describe('redactBodyFields', () => {
  it('redacts specified fields', () => {
    const result = redactBodyFields({ password: 'secret', name: 'Alice' }, ['password']) as any;
    expect(result.password).toBe('[REDACTED]');
    expect(result.name).toBe('Alice');
  });

  it('returns non-object body unchanged', () => {
    expect(redactBodyFields('plain', ['x'])).toBe('plain');
    expect(redactBodyFields(null, ['x'])).toBeNull();
    expect(redactBodyFields([1, 2], ['x'])).toEqual([1, 2]);
  });
});

describe('truncateBody', () => {
  it('truncates long strings', () => {
    const result = truncateBody('a'.repeat(200), 10);
    expect(result).toBe('aaaaaaaaaa...[truncated]');
  });

  it('leaves short strings intact', () => {
    expect(truncateBody('hello', 100)).toBe('hello');
  });

  it('leaves non-strings intact', () => {
    expect(truncateBody({ a: 1 }, 5)).toEqual({ a: 1 });
  });
});

describe('transformEntry', () => {
  it('redacts headers and body fields', () => {
    const entry = makeEntry();
    const result = transformEntry(entry, { redactBodyFields: ['password'] });
    expect(result.requestHeaders?.['authorization']).toBe('[REDACTED]');
    expect(result.responseHeaders?.['set-cookie']).toBe('[REDACTED]');
    expect((result.requestBody as any).password).toBe('[REDACTED]');
    expect((result.requestBody as any).name).toBe('Alice');
  });

  it('does not mutate original entry', () => {
    const entry = makeEntry();
    transformEntry(entry, { redactBodyFields: ['password'] });
    expect((entry.requestBody as any).password).toBe('secret');
  });
});

describe('transformEntries', () => {
  it('transforms all entries', () => {
    const entries = [makeEntry(), makeEntry({ path: '/api/posts' })];
    const results = transformEntries(entries, { redactBodyFields: ['password'] });
    expect(results).toHaveLength(2);
    results.forEach((r) => {
      expect(r.requestHeaders?.['authorization']).toBe('[REDACTED]');
    });
  });
});
