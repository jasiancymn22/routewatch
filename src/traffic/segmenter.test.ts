import { segmentEntries, mergeSegments, getSegmentNames, SegmentRule } from './segmenter';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/test',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    durationMs: 50,
    ...overrides,
  };
}

const rules: SegmentRule[] = [
  { name: 'success', match: (e) => e.statusCode >= 200 && e.statusCode < 300 },
  { name: 'client-error', match: (e) => e.statusCode >= 400 && e.statusCode < 500 },
  { name: 'server-error', match: (e) => e.statusCode >= 500 },
];

describe('segmentEntries', () => {
  it('places entries into correct segments', () => {
    const entries = [
      makeEntry({ statusCode: 200 }),
      makeEntry({ statusCode: 404 }),
      makeEntry({ statusCode: 500 }),
    ];
    const result = segmentEntries(entries, rules);
    expect(result.get('success')!.count).toBe(1);
    expect(result.get('client-error')!.count).toBe(1);
    expect(result.get('server-error')!.count).toBe(1);
    expect(result.get('unmatched')!.count).toBe(0);
  });

  it('places unmatched entries in unmatched segment', () => {
    const entries = [makeEntry({ statusCode: 301 })];
    const result = segmentEntries(entries, rules);
    expect(result.get('unmatched')!.count).toBe(1);
  });

  it('returns all rule names plus unmatched', () => {
    const result = segmentEntries([], rules);
    const names = getSegmentNames(result);
    expect(names).toContain('success');
    expect(names).toContain('unmatched');
  });
});

describe('mergeSegments', () => {
  it('merges two segment maps', () => {
    const a = segmentEntries([makeEntry({ statusCode: 200 })], rules);
    const b = segmentEntries([makeEntry({ statusCode: 200 })], rules);
    const merged = mergeSegments(a, b);
    expect(merged.get('success')!.count).toBe(2);
  });

  it('handles keys only in one map', () => {
    const a = segmentEntries([makeEntry({ statusCode: 200 })], rules);
    const b = new Map();
    const merged = mergeSegments(a, b);
    expect(merged.get('success')!.count).toBe(1);
  });
});
