import {
  extractSessionId,
  groupEntriesBySessions,
  getTopSessions,
  getErrorProneSessions,
} from './session';
import { TrafficEntry } from './types';

function makeEntry(
  overrides: Partial<TrafficEntry> = {}
): TrafficEntry {
  return {
    method: 'GET',
    path: '/test',
    statusCode: 200,
    durationMs: 50,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    requestBody: undefined,
    responseBody: undefined,
    ...overrides,
  };
}

describe('extractSessionId', () => {
  it('prefers x-session-id header', () => {
    const entry = makeEntry({ requestHeaders: { 'x-session-id': 'abc123' } });
    expect(extractSessionId(entry)).toBe('abc123');
  });

  it('falls back to x-request-id', () => {
    const entry = makeEntry({ requestHeaders: { 'x-request-id': 'req-99' } });
    expect(extractSessionId(entry)).toBe('req-99');
  });

  it('returns unknown when no headers match', () => {
    const entry = makeEntry({ requestHeaders: {} });
    expect(extractSessionId(entry)).toBe('unknown');
  });
});

describe('groupEntriesBySessions', () => {
  it('groups entries by session id', () => {
    const entries = [
      makeEntry({ requestHeaders: { 'x-session-id': 's1' }, timestamp: 100 }),
      makeEntry({ requestHeaders: { 'x-session-id': 's1' }, timestamp: 200 }),
      makeEntry({ requestHeaders: { 'x-session-id': 's2' }, timestamp: 150 }),
    ];
    const sessions = groupEntriesBySessions(entries);
    expect(sessions.size).toBe(2);
    expect(sessions.get('s1')?.routeCount).toBe(2);
    expect(sessions.get('s1')?.durationMs).toBe(100);
    expect(sessions.get('s2')?.routeCount).toBe(1);
  });

  it('counts errors correctly', () => {
    const entries = [
      makeEntry({ requestHeaders: { 'x-session-id': 's1' }, statusCode: 500 }),
      makeEntry({ requestHeaders: { 'x-session-id': 's1' }, statusCode: 200 }),
    ];
    const sessions = groupEntriesBySessions(entries);
    expect(sessions.get('s1')?.errorCount).toBe(1);
  });
});

describe('getTopSessions', () => {
  it('returns sessions sorted by route count', () => {
    const entries = [
      makeEntry({ requestHeaders: { 'x-session-id': 'a' } }),
      makeEntry({ requestHeaders: { 'x-session-id': 'b' } }),
      makeEntry({ requestHeaders: { 'x-session-id': 'b' } }),
    ];
    const sessions = groupEntriesBySessions(entries);
    const top = getTopSessions(sessions, 1);
    expect(top[0].sessionId).toBe('b');
  });
});

describe('getErrorProneSessions', () => {
  it('returns sessions above error threshold', () => {
    const entries = [
      makeEntry({ requestHeaders: { 'x-session-id': 'x' }, statusCode: 500 }),
      makeEntry({ requestHeaders: { 'x-session-id': 'x' }, statusCode: 500 }),
      makeEntry({ requestHeaders: { 'x-session-id': 'y' }, statusCode: 200 }),
    ];
    const sessions = groupEntriesBySessions(entries);
    const prone = getErrorProneSessions(sessions, 0.5);
    expect(prone.map((s) => s.sessionId)).toContain('x');
    expect(prone.map((s) => s.sessionId)).not.toContain('y');
  });
});
