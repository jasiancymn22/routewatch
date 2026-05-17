import {
  createSnapshot,
  mergeSnapshots,
  filterSnapshotByRoute,
  snapshotSince,
  summarizeSnapshot,
} from './snapshot';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    durationMs: 50,
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    ...overrides,
  };
}

describe('createSnapshot', () => {
  it('sets entryCount and routes correctly', () => {
    const entries = [
      makeEntry({ path: '/a', method: 'GET' }),
      makeEntry({ path: '/b', method: 'POST' }),
      makeEntry({ path: '/a', method: 'GET' }),
    ];
    const snap = createSnapshot(entries);
    expect(snap.meta.entryCount).toBe(3);
    expect(snap.meta.routes).toContain('GET:/a');
    expect(snap.meta.routes).toContain('POST:/b');
    expect(snap.meta.routes).toHaveLength(2);
  });

  it('sets capturedAt to a recent timestamp', () => {
    const before = Date.now();
    const snap = createSnapshot([]);
    expect(snap.meta.capturedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('mergeSnapshots', () => {
  it('combines entries from both snapshots', () => {
    const a = createSnapshot([makeEntry({ path: '/a' })]);
    const b = createSnapshot([makeEntry({ path: '/b' })]);
    const merged = mergeSnapshots(a, b);
    expect(merged.meta.entryCount).toBe(2);
  });
});

describe('filterSnapshotByRoute', () => {
  it('returns only entries matching the route', () => {
    const entries = [
      makeEntry({ method: 'GET', path: '/a' }),
      makeEntry({ method: 'GET', path: '/b' }),
    ];
    const snap = createSnapshot(entries);
    const filtered = filterSnapshotByRoute(snap, 'GET:/a');
    expect(filtered.meta.entryCount).toBe(1);
    expect(filtered.entries[0].path).toBe('/a');
  });
});

describe('snapshotSince', () => {
  it('filters entries older than since', () => {
    const now = Date.now();
    const entries = [
      makeEntry({ timestamp: now - 10000 }),
      makeEntry({ timestamp: now - 1000 }),
      makeEntry({ timestamp: now }),
    ];
    const snap = createSnapshot(entries);
    const recent = snapshotSince(snap, now - 2000);
    expect(recent.meta.entryCount).toBe(2);
  });
});

describe('summarizeSnapshot', () => {
  it('returns the meta object', () => {
    const snap = createSnapshot([makeEntry()]);
    const meta = summarizeSnapshot(snap);
    expect(meta).toBe(snap.meta);
  });
});
