import {
  createQuotaStore,
  quotaKey,
  checkQuota,
  applyQuotaRules,
  getExceededQuotas,
  QuotaRule,
} from './quota';
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

describe('quotaKey', () => {
  it('formats key as METHOD:route', () => {
    expect(quotaKey('/api/users', 'get')).toBe('GET:/api/users');
  });
});

describe('checkQuota', () => {
  it('increments count on each call', () => {
    const store = createQuotaStore();
    const rule: QuotaRule = { route: '/api/test', maxRequests: 5, windowMs: 60000 };
    const entry = makeEntry();
    const now = Date.now();

    const s1 = checkQuota(store, rule, entry, now);
    const s2 = checkQuota(store, rule, entry, now + 100);

    expect(s1.count).toBe(1);
    expect(s2.count).toBe(2);
    expect(s2.exceeded).toBe(false);
  });

  it('marks exceeded when count exceeds limit', () => {
    const store = createQuotaStore();
    const rule: QuotaRule = { route: '/api/test', maxRequests: 2, windowMs: 60000 };
    const entry = makeEntry();
    const now = Date.now();

    checkQuota(store, rule, entry, now);
    checkQuota(store, rule, entry, now + 100);
    const s3 = checkQuota(store, rule, entry, now + 200);

    expect(s3.exceeded).toBe(true);
    expect(s3.count).toBe(3);
  });

  it('resets window after windowMs', () => {
    const store = createQuotaStore();
    const rule: QuotaRule = { route: '/api/test', maxRequests: 2, windowMs: 1000 };
    const entry = makeEntry();
    const now = Date.now();

    checkQuota(store, rule, entry, now);
    checkQuota(store, rule, entry, now + 100);
    const s3 = checkQuota(store, rule, entry, now + 2000);

    expect(s3.count).toBe(1);
    expect(s3.exceeded).toBe(false);
  });
});

describe('applyQuotaRules', () => {
  it('returns statuses for matched routes', () => {
    const entries = [
      makeEntry({ path: '/api/items', method: 'GET', timestamp: 1000 }),
      makeEntry({ path: '/api/items', method: 'GET', timestamp: 2000 }),
    ];
    const rules: QuotaRule[] = [{ route: '/api/items', maxRequests: 1, windowMs: 60000 }];
    const result = applyQuotaRules(entries, rules);
    expect(result.size).toBe(1);
  });
});

describe('getExceededQuotas', () => {
  it('filters only exceeded statuses', () => {
    const statuses = new Map([
      ['a', { route: '/a', method: 'GET', count: 3, limit: 2, exceeded: true, resetAt: 0 }],
      ['b', { route: '/b', method: 'POST', count: 1, limit: 5, exceeded: false, resetAt: 0 }],
    ]);
    const exceeded = getExceededQuotas(statuses);
    expect(exceeded).toHaveLength(1);
    expect(exceeded[0].route).toBe('/a');
  });
});
