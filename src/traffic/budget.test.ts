import { checkBudget, groupViolationsByRoute, BudgetRule } from './budget';
import { TrafficEntry } from './types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    timestamp: Date.now(),
    durationMs: 100,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

describe('checkBudget', () => {
  it('returns no violations when all within budget', () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const rules: BudgetRule[] = [{ route: '/api/users', maxErrorRate: 0.5 }];
    expect(checkBudget(entries, rules)).toHaveLength(0);
  });

  it('detects error rate violation', () => {
    const entries = [
      makeEntry({ statusCode: 500 }),
      makeEntry({ statusCode: 500 }),
      makeEntry({ statusCode: 200 }),
    ];
    const rules: BudgetRule[] = [{ route: '/api/users', maxErrorRate: 0.3 }];
    const violations = checkBudget(entries, rules);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('maxErrorRate');
    expect(violations[0].actual).toBeCloseTo(0.667, 2);
  });

  it('detects p99 latency violation', () => {
    const entries = Array.from({ length: 100 }, (_, i) =>
      makeEntry({ durationMs: i * 10 })
    );
    const rules: BudgetRule[] = [{ route: '/api/users', maxP99LatencyMs: 800 }];
    const violations = checkBudget(entries, rules);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('maxP99LatencyMs');
  });

  it('respects method filter', () => {
    const entries = [
      makeEntry({ method: 'POST', statusCode: 500 }),
      makeEntry({ method: 'GET', statusCode: 200 }),
    ];
    const rules: BudgetRule[] = [{ route: '/api/users', method: 'GET', maxErrorRate: 0.1 }];
    expect(checkBudget(entries, rules)).toHaveLength(0);
  });

  it('skips routes with no matching entries', () => {
    const entries = [makeEntry({ path: '/other' })];
    const rules: BudgetRule[] = [{ route: '/api/users', maxErrorRate: 0.1 }];
    expect(checkBudget(entries, rules)).toHaveLength(0);
  });
});

describe('groupViolationsByRoute', () => {
  it('groups violations by route', () => {
    const entries = [
      makeEntry({ statusCode: 500 }),
      makeEntry({ statusCode: 500 }),
      makeEntry({ statusCode: 500 }),
    ];
    const rules: BudgetRule[] = [
      { route: '/api/users', maxErrorRate: 0.1, maxP99LatencyMs: 1 },
    ];
    const violations = checkBudget(entries, rules);
    const grouped = groupViolationsByRoute(violations);
    expect(grouped['/api/users']).toBeDefined();
    expect(grouped['/api/users'].length).toBeGreaterThanOrEqual(1);
  });
});
