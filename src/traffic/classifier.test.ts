import {
  classifyMethod,
  classifyEntry,
  classifyEntries,
  groupByCategory,
  isAuthenticated,
  isErrorResponse,
} from './classifier';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/test',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    durationMs: 10,
    ...overrides,
  };
}

describe('classifyMethod', () => {
  it('classifies GET as read', () => expect(classifyMethod('GET')).toBe('read'));
  it('classifies HEAD as read', () => expect(classifyMethod('HEAD')).toBe('read'));
  it('classifies POST as write', () => expect(classifyMethod('POST')).toBe('write'));
  it('classifies PUT as write', () => expect(classifyMethod('PUT')).toBe('write'));
  it('classifies PATCH as write', () => expect(classifyMethod('PATCH')).toBe('write'));
  it('classifies DELETE as delete', () => expect(classifyMethod('DELETE')).toBe('delete'));
  it('classifies unknown as other', () => expect(classifyMethod('CONNECT')).toBe('other'));
  it('handles lowercase', () => expect(classifyMethod('get')).toBe('read'));
});

describe('isAuthenticated', () => {
  it('returns true when authorization header present', () => {
    expect(isAuthenticated(makeEntry({ requestHeaders: { authorization: 'Bearer token' } }))).toBe(true);
  });
  it('returns true when x-api-key header present', () => {
    expect(isAuthenticated(makeEntry({ requestHeaders: { 'x-api-key': 'key' } }))).toBe(true);
  });
  it('returns false when no auth headers', () => {
    expect(isAuthenticated(makeEntry({ requestHeaders: { 'content-type': 'application/json' } }))).toBe(false);
  });
});

describe('isErrorResponse', () => {
  it('returns false for 200', () => expect(isErrorResponse(makeEntry({ statusCode: 200 }))).toBe(false));
  it('returns true for 400', () => expect(isErrorResponse(makeEntry({ statusCode: 400 }))).toBe(true));
  it('returns true for 500', () => expect(isErrorResponse(makeEntry({ statusCode: 500 }))).toBe(true));
});

describe('classifyEntries', () => {
  it('classifies multiple entries', () => {
    const entries = [
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'POST', statusCode: 201 }),
      makeEntry({ method: 'DELETE', statusCode: 404 }),
    ];
    const result = classifyEntries(entries);
    expect(result).toHaveLength(3);
    expect(result[0].category).toBe('read');
    expect(result[1].category).toBe('write');
    expect(result[2].category).toBe('delete');
    expect(result[2].isErrorResponse).toBe(true);
  });
});

describe('groupByCategory', () => {
  it('groups classified entries by category', () => {
    const entries = classifyEntries([
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'GET' }),
      makeEntry({ method: 'POST' }),
      makeEntry({ method: 'DELETE' }),
    ]);
    const groups = groupByCategory(entries);
    expect(groups.read).toHaveLength(2);
    expect(groups.write).toHaveLength(1);
    expect(groups.delete).toHaveLength(1);
    expect(groups.other).toHaveLength(0);
  });
});
