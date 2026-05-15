import { buildBudgetExtension, applyBudgetToDocument } from './budget-bridge';
import { BudgetViolation } from '../traffic/budget';
import { TrafficEntry } from '../traffic/types';
import { OpenAPIObject } from 'openapi3-ts/oas30';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/items',
    statusCode: 200,
    timestamp: Date.now(),
    durationMs: 50,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

function makeDoc(overrides: Partial<OpenAPIObject> = {}): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    ...overrides,
  };
}

describe('buildBudgetExtension', () => {
  it('returns x-budget-violations array', () => {
    const violations: BudgetViolation[] = [
      { route: '/api/items', method: 'GET', rule: 'maxErrorRate', actual: 0.6, limit: 0.1 },
    ];
    const ext = buildBudgetExtension(violations);
    expect(ext['x-budget-violations']).toHaveLength(1);
    expect((ext['x-budget-violations'] as any[])[0].rule).toBe('maxErrorRate');
  });

  it('rounds actual values to 3 decimal places', () => {
    const violations: BudgetViolation[] = [
      { route: '/api/items', method: 'GET', rule: 'maxErrorRate', actual: 0.66666, limit: 0.1 },
    ];
    const ext = buildBudgetExtension(violations);
    expect((ext['x-budget-violations'] as any[])[0].actual).toBe(0.667);
  });
});

describe('applyBudgetToDocument', () => {
  it('annotates operations with budget violations', () => {
    const entries = [
      makeEntry({ statusCode: 500 }),
      makeEntry({ statusCode: 500 }),
      makeEntry({ statusCode: 200 }),
    ];
    const doc = makeDoc({
      paths: {
        '/api/items': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    });
    const result = applyBudgetToDocument(doc, entries, [
      { route: '/api/items', method: 'GET', maxErrorRate: 0.1 },
    ]);
    const op = result.paths!['/api/items']!.get as any;
    expect(op['x-budget-violations']).toBeDefined();
    expect(op['x-budget-violations'].length).toBeGreaterThan(0);
  });

  it('adds x-budget-violation-count to info', () => {
    const entries = [makeEntry({ statusCode: 500 }), makeEntry({ statusCode: 500 })];
    const doc = makeDoc({
      paths: { '/api/items': { get: { responses: {} } } },
    });
    const result = applyBudgetToDocument(doc, entries, [
      { route: '/api/items', maxErrorRate: 0.1 },
    ]);
    expect((result.info as any)['x-budget-violation-count']).toBeGreaterThan(0);
  });

  it('leaves document unchanged when no violations', () => {
    const entries = [makeEntry(), makeEntry()];
    const doc = makeDoc({ paths: { '/api/items': { get: { responses: {} } } } });
    const result = applyBudgetToDocument(doc, entries, [
      { route: '/api/items', maxErrorRate: 0.9 },
    ]);
    expect((result.info as any)['x-budget-violation-count']).toBe(0);
  });
});
