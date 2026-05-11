import {
  createTrafficStore,
  normalizePath,
  shouldIgnore,
  recordRequest,
  getTrafficSnapshot,
} from './recorder';
import { RequestRecord } from './types';

const makeRecord = (overrides: Partial<RequestRecord> = {}): RequestRecord => ({
  method: 'GET',
  path: '/users/42',
  statusCode: 200,
  requestHeaders: {},
  responseHeaders: {},
  queryParams: {},
  pathParams: {},
  timestamp: Date.now(),
  durationMs: 12,
  ...overrides,
});

describe('normalizePath', () => {
  it('replaces numeric segments with {id}', () => {
    expect(normalizePath('/users/123')).toBe('/users/{id}');
  });

  it('replaces UUID segments with {uuid}', () => {
    expect(normalizePath('/orders/550e8400-e29b-41d4-a716-446655440000')).toBe('/orders/{uuid}');
  });

  it('leaves non-id paths unchanged', () => {
    expect(normalizePath('/health')).toBe('/health');
  });
});

describe('shouldIgnore', () => {
  it('ignores exact string matches', () => {
    expect(shouldIgnore('/health', ['/health'])).toBe(true);
  });

  it('ignores regex matches', () => {
    expect(shouldIgnore('/internal/metrics', [/^\/internal/])).toBe(true);
  });

  it('does not ignore non-matching paths', () => {
    expect(shouldIgnore('/users', ['/health'])).toBe(false);
  });
});

describe('recordRequest', () => {
  it('stores a new route on first record', () => {
    const store = createTrafficStore();
    recordRequest(store, makeRecord());
    expect(store.size).toBe(1);
  });

  it('respects maxSamplesPerRoute', () => {
    const store = createTrafficStore();
    for (let i = 0; i < 5; i++) recordRequest(store, makeRecord(), { maxSamplesPerRoute: 3 });
    const snapshot = getTrafficSnapshot(store);
    expect(snapshot[0].samples.length).toBe(3);
  });

  it('skips ignored routes', () => {
    const store = createTrafficStore();
    recordRequest(store, makeRecord({ path: '/health' }), { ignoreRoutes: ['/health'] });
    expect(store.size).toBe(0);
  });
});
