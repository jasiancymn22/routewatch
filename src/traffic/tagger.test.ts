import {
  applyTagRules,
  tagEntries,
  filterByTag,
  groupByTag,
  getUniqueTags,
  builtinTagRules,
  TagRule,
} from './tagger';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
    durationMs: 50,
    ...overrides,
  } as TrafficEntry;
}

describe('applyTagRules', () => {
  it('applies matching rules', () => {
    const rules: TagRule[] = [
      { tag: 'fast', match: (e) => (e.durationMs ?? 0) < 100 },
      { tag: 'slow', match: (e) => (e.durationMs ?? 0) >= 100 },
    ];
    const entry = makeEntry({ durationMs: 50 });
    const tagged = applyTagRules(entry, rules);
    expect(tagged.tags).toEqual(['fast']);
  });

  it('returns empty tags if no rules match', () => {
    const entry = makeEntry();
    const tagged = applyTagRules(entry, []);
    expect(tagged.tags).toEqual([]);
  });
});

describe('tagEntries', () => {
  it('tags all entries', () => {
    const entries = [makeEntry({ statusCode: 200 }), makeEntry({ statusCode: 500 })];
    const tagged = tagEntries(entries, builtinTagRules);
    expect(tagged[0].tags).toContain('read');
    expect(tagged[1].tags).toContain('error');
  });
});

describe('filterByTag', () => {
  it('filters entries by tag', () => {
    const entries = tagEntries(
      [makeEntry({ statusCode: 200 }), makeEntry({ statusCode: 404 })],
      builtinTagRules
    );
    const errors = filterByTag(entries, 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].statusCode).toBe(404);
  });
});

describe('groupByTag', () => {
  it('groups entries by each tag', () => {
    const entries = tagEntries(
      [makeEntry({ method: 'POST', statusCode: 500 }), makeEntry({ method: 'GET', statusCode: 200 })],
      builtinTagRules
    );
    const grouped = groupByTag(entries);
    expect(grouped['error']).toHaveLength(1);
    expect(grouped['read']).toHaveLength(1);
    expect(grouped['mutation']).toHaveLength(1);
  });
});

describe('getUniqueTags', () => {
  it('returns sorted unique tags', () => {
    const entries = tagEntries(
      [makeEntry({ method: 'GET', statusCode: 200 }), makeEntry({ method: 'POST', statusCode: 201 })],
      builtinTagRules
    );
    const tags = getUniqueTags(entries);
    expect(tags).toEqual(expect.arrayContaining(['mutation', 'read']));
    expect(tags).toEqual([...tags].sort());
  });
});

describe('builtinTagRules', () => {
  it('tags authenticated entries', () => {
    const entry = makeEntry({ requestHeaders: { authorization: 'Bearer token' } });
    const tagged = applyTagRules(entry, builtinTagRules);
    expect(tagged.tags).toContain('authenticated');
  });

  it('tags slow entries', () => {
    const entry = makeEntry({ durationMs: 2000 });
    const tagged = applyTagRules(entry, builtinTagRules);
    expect(tagged.tags).toContain('slow');
  });
});
