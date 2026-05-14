import { shouldSample, applyMaxPerRoute, sampleEntries } from './sampler';
import { TrafficEntry } from './types';

function makeEntry(path: string, method = 'GET', timestamp = Date.now()): TrafficEntry {
  return {
    path,
    method,
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    requestBody: undefined,
    responseBody: undefined,
    timestamp,
  };
}

describe('shouldSample', () => {
  it('always samples when rate is 1.0', () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldSample({ sampleRate: 1.0 })).toBe(true);
    }
  });

  it('never samples when rate is 0', () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldSample({ sampleRate: 0 })).toBe(false);
    }
  });

  it('uses custom random function', () => {
    expect(shouldSample({ sampleRate: 0.5, random: () => 0.3 })).toBe(true);
    expect(shouldSample({ sampleRate: 0.5, random: () => 0.7 })).toBe(false);
  });
});

describe('applyMaxPerRoute', () => {
  it('keeps all entries when under the limit', () => {
    const entries = [makeEntry('/a'), makeEntry('/b'), makeEntry('/a')];
    expect(applyMaxPerRoute(entries, 5)).toHaveLength(3);
  });

  it('caps entries per route+method to maxPerRoute', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry('/users', 'GET', i)
    );
    const result = applyMaxPerRoute(entries, 3);
    expect(result).toHaveLength(3);
  });

  it('keeps the most recent entries', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry('/users', 'GET', i)
    );
    const result = applyMaxPerRoute(entries, 2);
    const timestamps = result.map((e) => e.timestamp).sort();
    expect(timestamps).toEqual([3, 4]);
  });

  it('handles multiple routes independently', () => {
    const entries = [
      ...Array.from({ length: 5 }, () => makeEntry('/a')),
      ...Array.from({ length: 5 }, () => makeEntry('/b')),
    ];
    const result = applyMaxPerRoute(entries, 2);
    expect(result).toHaveLength(4);
  });
});

describe('sampleEntries', () => {
  it('returns all entries with default options', () => {
    const entries = [makeEntry('/a'), makeEntry('/b')];
    expect(sampleEntries(entries)).toHaveLength(2);
  });

  it('filters entries by sample rate', () => {
    const entries = Array.from({ length: 100 }, () => makeEntry('/x'));
    let call = 0;
    const random = () => (call++ % 2 === 0 ? 0.2 : 0.8);
    const result = sampleEntries(entries, { sampleRate: 0.5, random, maxPerRoute: 1000 });
    expect(result.length).toBe(50);
  });

  it('applies maxPerRoute after sampling', () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      makeEntry('/route', 'GET', i)
    );
    const result = sampleEntries(entries, { sampleRate: 1.0, maxPerRoute: 5 });
    expect(result).toHaveLength(5);
  });
});
