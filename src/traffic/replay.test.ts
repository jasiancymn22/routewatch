import { replayEntries, sliceReplayWindow, sortEntriesByTime } from './replay';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/test',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    requestBody: undefined,
    responseBody: undefined,
    ...overrides,
  };
}

describe('sortEntriesByTime', () => {
  it('sorts entries by timestamp ascending', () => {
    const entries = [
      makeEntry({ timestamp: 300 }),
      makeEntry({ timestamp: 100 }),
      makeEntry({ timestamp: 200 }),
    ];
    const sorted = sortEntriesByTime(entries);
    expect(sorted.map((e) => e.timestamp)).toEqual([100, 200, 300]);
  });

  it('does not mutate original array', () => {
    const entries = [makeEntry({ timestamp: 200 }), makeEntry({ timestamp: 100 })];
    sortEntriesByTime(entries);
    expect(entries[0].timestamp).toBe(200);
  });
});

describe('replayEntries', () => {
  it('calls onEntry for each entry', async () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const seen: TrafficEntry[] = [];
    const result = await replayEntries(entries, { onEntry: (e) => seen.push(e) });
    expect(seen).toHaveLength(3);
    expect(result.replayed).toBe(3);
    expect(result.skipped).toBe(0);
  });

  it('respects filter option', async () => {
    const entries = [
      makeEntry({ path: '/a' }),
      makeEntry({ path: '/b' }),
      makeEntry({ path: '/a' }),
    ];
    const result = await replayEntries(entries, {
      filter: (e) => e.path === '/a',
    });
    expect(result.replayed).toBe(2);
    expect(result.skipped).toBe(1);
  });

  it('returns durationMs', async () => {
    const entries = [makeEntry()];
    const result = await replayEntries(entries);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('sliceReplayWindow', () => {
  it('returns entries within time window', () => {
    const entries = [
      makeEntry({ timestamp: 100 }),
      makeEntry({ timestamp: 200 }),
      makeEntry({ timestamp: 300 }),
    ];
    const sliced = sliceReplayWindow(entries, 150, 250);
    expect(sliced).toHaveLength(1);
    expect(sliced[0].timestamp).toBe(200);
  });

  it('includes boundary timestamps', () => {
    const entries = [makeEntry({ timestamp: 100 }), makeEntry({ timestamp: 300 })];
    const sliced = sliceReplayWindow(entries, 100, 300);
    expect(sliced).toHaveLength(2);
  });
});
