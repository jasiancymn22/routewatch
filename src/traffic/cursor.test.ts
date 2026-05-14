import { cursorPaginate } from './cursor';
import { TrafficEntry } from './types';

function makeEntry(timestamp: number): TrafficEntry {
  return {
    path: '/api/test',
    method: 'GET',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: undefined,
    responseBody: undefined,
    query: {},
    timestamp,
    durationMs: 5,
  };
}

const entries = [10, 20, 30, 40, 50, 60, 70].map(makeEntry);

describe('cursorPaginate', () => {
  it('returns first page without cursor', () => {
    const result = cursorPaginate(entries, 3);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].timestamp).toBe(10);
    expect(result.nextCursor).not.toBeNull();
    expect(result.prevCursor).toBeNull();
    expect(result.total).toBe(7);
  });

  it('returns next page using nextCursor', () => {
    const first = cursorPaginate(entries, 3);
    const second = cursorPaginate(entries, 3, first.nextCursor!);
    expect(second.items[0].timestamp).toBe(40);
    expect(second.items).toHaveLength(3);
    expect(second.nextCursor).not.toBeNull();
    expect(second.prevCursor).not.toBeNull();
  });

  it('returns last partial page', () => {
    const first = cursorPaginate(entries, 3);
    const second = cursorPaginate(entries, 3, first.nextCursor!);
    const third = cursorPaginate(entries, 3, second.nextCursor!);
    expect(third.items).toHaveLength(1);
    expect(third.items[0].timestamp).toBe(70);
    expect(third.nextCursor).toBeNull();
  });

  it('handles empty entries', () => {
    const result = cursorPaginate([], 5);
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
    expect(result.prevCursor).toBeNull();
    expect(result.total).toBe(0);
  });

  it('throws on invalid pageSize', () => {
    expect(() => cursorPaginate(entries, 0)).toThrow();
  });

  it('throws on invalid cursor', () => {
    expect(() => cursorPaginate(entries, 3, 'not-valid-base64-json!!!')).toThrow();
  });

  it('sorts entries by timestamp before paginating', () => {
    const unordered = [50, 10, 30].map(makeEntry);
    const result = cursorPaginate(unordered, 2);
    expect(result.items[0].timestamp).toBe(10);
    expect(result.items[1].timestamp).toBe(30);
  });
});
