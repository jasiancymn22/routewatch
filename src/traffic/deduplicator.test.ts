import {
  entryKey,
  groupByKey,
  deduplicateEntries,
  pickLatestPerKey,
} from './deduplicator';
import { TrafficEntry } from './types';

function makeEntry(
  method: string,
  path: string,
  statusCode: number,
  timestamp: string
): TrafficEntry {
  return {
    method,
    path,
    statusCode,
    timestamp,
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    requestBody: undefined,
    responseBody: undefined,
    durationMs: 10,
  };
}

const now = new Date();
const ts = (offsetMs: number) =>
  new Date(now.getTime() - offsetMs).toISOString();

describe('entryKey', () => {
  it('generates a key from method, path, and status', () => {
    const entry = makeEntry('GET', '/users', 200, ts(0));
    expect(entryKey(entry)).toBe('GET:/users:200');
  });
});

describe('groupByKey', () => {
  it('groups entries with the same key together', () => {
    const entries = [
      makeEntry('GET', '/users', 200, ts(100)),
      makeEntry('GET', '/users', 200, ts(200)),
      makeEntry('POST', '/users', 201, ts(300)),
    ];
    const groups = groupByKey(entries);
    expect(groups.size).toBe(2);
    expect(groups.get('GET:/users:200')).toHaveLength(2);
    expect(groups.get('POST:/users:201')).toHaveLength(1);
  });
});

describe('deduplicateEntries', () => {
  it('filters out entries older than the window', () => {
    const entries = [
      makeEntry('GET', '/old', 200, ts(120_000)),
      makeEntry('GET', '/new', 200, ts(1_000)),
    ];
    const result = deduplicateEntries(entries, { windowMs: 60_000 });
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/new');
  });

  it('caps similar entries at maxSimilarEntries', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry('GET', '/items', 200, ts(i * 100))
    );
    const result = deduplicateEntries(entries, {
      windowMs: 60_000,
      maxSimilarEntries: 3,
    });
    expect(result).toHaveLength(3);
  });

  it('keeps the most recent entries when capping', () => {
    const entries = [
      makeEntry('GET', '/ping', 200, ts(5_000)),
      makeEntry('GET', '/ping', 200, ts(1_000)),
      makeEntry('GET', '/ping', 200, ts(3_000)),
    ];
    const result = deduplicateEntries(entries, {
      windowMs: 60_000,
      maxSimilarEntries: 1,
    });
    expect(result).toHaveLength(1);
    expect(new Date(result[0].timestamp).getTime()).toBe(
      new Date(ts(1_000)).getTime()
    );
  });
});

describe('pickLatestPerKey', () => {
  it('returns only the most recent entry per key', () => {
    const entries = [
      makeEntry('GET', '/users', 200, ts(5_000)),
      makeEntry('GET', '/users', 200, ts(1_000)),
      makeEntry('DELETE', '/users', 204, ts(2_000)),
    ];
    const result = pickLatestPerKey(entries);
    expect(result).toHaveLength(2);
    const getEntry = result.find((e) => e.method === 'GET')!;
    expect(new Date(getEntry.timestamp).getTime()).toBe(
      new Date(ts(1_000)).getTime()
    );
  });
});
