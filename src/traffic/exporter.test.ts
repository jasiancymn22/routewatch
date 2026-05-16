import {
  serializeEntries,
  deserializeEntries,
  serializeToCSV,
  entryToCSVRow,
  entriestoCSVHeader,
} from './exporter';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    timestamp: 1700000000000,
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    requestBody: undefined,
    responseBody: undefined,
    ...overrides,
  };
}

describe('serializeEntries', () => {
  it('serializes to JSON by default', () => {
    const entries = [makeEntry()];
    const result = serializeEntries(entries);
    expect(JSON.parse(result)).toHaveLength(1);
  });

  it('serializes to pretty JSON', () => {
    const entries = [makeEntry()];
    const result = serializeEntries(entries, { pretty: true });
    expect(result).toContain('\n');
  });

  it('serializes to ndjson', () => {
    const entries = [makeEntry(), makeEntry({ path: '/api/posts' })];
    const result = serializeEntries(entries, { format: 'ndjson' });
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).path).toBe('/api/users');
  });

  it('serializes an empty array to an empty JSON array', () => {
    const result = serializeEntries([]);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('serializes an empty array to empty string in ndjson', () => {
    const result = serializeEntries([], { format: 'ndjson' });
    expect(result).toBe('');
  });
});

describe('deserializeEntries', () => {
  it('deserializes JSON', () => {
    const entries = [makeEntry(), makeEntry({ path: '/other' })];
    const raw = JSON.stringify(entries);
    const result = deserializeEntries(raw);
    expect(result).toHaveLength(2);
  });

  it('deserializes ndjson', () => {
    const entries = [makeEntry(), makeEntry({ path: '/other' })];
    const raw = entries.map((e) => JSON.stringify(e)).join('\n');
    const result = deserializeEntries(raw, 'ndjson');
    expect(result).toHaveLength(2);
    expect(result[1].path).toBe('/other');
  });

  it('round-trips through ndjson', () => {
    const entries = [makeEntry(), makeEntry({ statusCode: 404 })];
    const raw = serializeEntries(entries, { format: 'ndjson' });
    const restored = deserializeEntries(raw, 'ndjson');
    expect(restored[1].statusCode).toBe(404);
  });
});

describe('serializeToCSV', () => {
  it('includes header row', () => {
    const result = serializeToCSV([makeEntry()]);
    expect(result.startsWith(entriestoCSVHeader())).toBe(true);
  });

  it('includes one row per entry', () => {
    const entries = [makeEntry(), makeEntry({ path: '/b' })];
    const lines = serializeToCSV(entries).split('\n');
    expect(lines).toHaveLength(3);
  });

  it('formats entry row correctly', () => {
    const entry = makeEntry();
    const row = entryToCSVRow(entry);
    expect(row).toBe(`GET,/api/users,200,1700000000000`);
  });

  it('returns only header row for empty entries', () => {
    const result = serializeToCSV([]);
    expect(result).toBe(entriestoCSVHeader());
  });
});
