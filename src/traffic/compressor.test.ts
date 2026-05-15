import {
  compressEntries,
  decompressSnapshot,
  serializeSnapshot,
  deserializeSnapshot,
} from './compressor';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    timestamp: 1700000000000,
    duration: 42,
    query: {},
    headers: { 'content-type': 'application/json', 'x-custom': 'ignored' },
    requestBody: undefined,
    responseBody: { id: 1 },
    ...overrides,
  };
}

describe('compressEntries', () => {
  it('compresses entries into a snapshot', () => {
    const entries = [makeEntry(), makeEntry({ method: 'POST', statusCode: 201 })];
    const snapshot = compressEntries(entries);
    expect(snapshot.version).toBe(1);
    expect(snapshot.count).toBe(2);
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries[0].m).toBe('GET');
    expect(snapshot.entries[1].m).toBe('POST');
  });

  it('omits empty query and undefined body', () => {
    const entry = makeEntry({ query: {}, requestBody: undefined });
    const snapshot = compressEntries([entry]);
    expect(snapshot.entries[0].q).toBeUndefined();
    expect(snapshot.entries[0].b).toBeUndefined();
  });

  it('filters headers to allowlist only', () => {
    const entry = makeEntry({ headers: { 'content-type': 'application/json', 'x-secret': 'abc' } });
    const snapshot = compressEntries([entry]);
    expect(snapshot.entries[0].h).toEqual({ 'content-type': 'application/json' });
    expect(snapshot.entries[0].h?.['x-secret']).toBeUndefined();
  });

  it('includes duration when present', () => {
    const snapshot = compressEntries([makeEntry({ duration: 99 })]);
    expect(snapshot.entries[0].d).toBe(99);
  });
});

describe('decompressSnapshot', () => {
  it('round-trips entries through compress/decompress', () => {
    const entries = [makeEntry(), makeEntry({ method: 'DELETE', statusCode: 204 })];
    const snapshot = compressEntries(entries);
    const restored = decompressSnapshot(snapshot);
    expect(restored).toHaveLength(2);
    expect(restored[0].method).toBe('GET');
    expect(restored[1].method).toBe('DELETE');
    expect(restored[0].path).toBe('/api/users');
  });

  it('throws on unsupported version', () => {
    const bad = { version: 99, timestamp: 0, count: 0, entries: [] } as any;
    expect(() => decompressSnapshot(bad)).toThrow('Unsupported snapshot version');
  });
});

describe('serializeSnapshot / deserializeSnapshot', () => {
  it('serializes and deserializes a snapshot', () => {
    const snapshot = compressEntries([makeEntry()]);
    const raw = serializeSnapshot(snapshot);
    expect(typeof raw).toBe('string');
    const parsed = deserializeSnapshot(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.entries).toHaveLength(1);
  });

  it('throws on invalid JSON structure', () => {
    expect(() => deserializeSnapshot('{"version":2,"entries":[]}')).toThrow('Invalid snapshot format');
    expect(() => deserializeSnapshot('{"version":1,"entries":"bad"}')).toThrow('Invalid snapshot format');
  });
});
