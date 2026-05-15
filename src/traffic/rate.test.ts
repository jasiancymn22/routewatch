import {
  routeRateKey,
  createRateWindow,
  updateRateWindow,
  computeRateMap,
  getRequestRate,
  hotRoutes,
} from './rate';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    timestamp: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
    queryParams: {},
    ...overrides,
  };
}

describe('routeRateKey', () => {
  it('combines method and path', () => {
    const entry = makeEntry({ method: 'POST', path: '/users' });
    expect(routeRateKey(entry)).toBe('POST:/users');
  });
});

describe('createRateWindow', () => {
  it('initializes with count 1', () => {
    const entry = makeEntry({ timestamp: 1000 });
    const window = createRateWindow(entry, 60_000);
    expect(window.count).toBe(1);
    expect(window.firstSeen).toBe(1000);
    expect(window.lastSeen).toBe(1000);
    expect(window.windowMs).toBe(60_000);
  });
});

describe('updateRateWindow', () => {
  it('increments count within window', () => {
    const base = makeEntry({ timestamp: 1000 });
    const window = createRateWindow(base, 60_000);
    const next = makeEntry({ timestamp: 2000 });
    const updated = updateRateWindow(window, next);
    expect(updated.count).toBe(2);
    expect(updated.lastSeen).toBe(2000);
  });

  it('resets when outside window', () => {
    const base = makeEntry({ timestamp: 1000 });
    const window = createRateWindow(base, 1000);
    const next = makeEntry({ timestamp: 5000 });
    const updated = updateRateWindow(window, next);
    expect(updated.count).toBe(1);
    expect(updated.firstSeen).toBe(5000);
  });
});

describe('computeRateMap', () => {
  it('groups entries by route key', () => {
    const entries = [
      makeEntry({ method: 'GET', path: '/a', timestamp: 100 }),
      makeEntry({ method: 'GET', path: '/a', timestamp: 200 }),
      makeEntry({ method: 'POST', path: '/b', timestamp: 100 }),
    ];
    const map = computeRateMap(entries, 60_000);
    expect(map['GET:/a'].count).toBe(2);
    expect(map['POST:/b'].count).toBe(1);
  });
});

describe('getRequestRate', () => {
  it('returns requests per second', () => {
    const window = { windowMs: 60_000, count: 10, firstSeen: 0, lastSeen: 10_000 };
    expect(getRequestRate(window)).toBeCloseTo(1);
  });
});

describe('hotRoutes', () => {
  it('returns top N routes by rps', () => {
    const entries = [
      makeEntry({ path: '/slow', timestamp: 1000 }),
      makeEntry({ path: '/slow', timestamp: 10000 }),
      makeEntry({ path: '/fast', timestamp: 1000 }),
      makeEntry({ path: '/fast', timestamp: 1100 }),
      makeEntry({ path: '/fast', timestamp: 1200 }),
    ];
    const map = computeRateMap(entries, 60_000);
    const hot = hotRoutes(map, 1);
    expect(hot[0].route).toBe('GET:/fast');
  });
});
