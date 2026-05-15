import { buildQuotaExtension, applyQuotasToDocument } from './quota-bridge';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { QuotaRule, QuotaStatus } from '../traffic/quota';

function makeDoc(overrides: Partial<OpenAPIObject> = {}): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/api/items': {
        get: { responses: { '200': { description: 'OK' } } },
      },
    },
    ...overrides,
  };
}

describe('buildQuotaExtension', () => {
  it('returns limit and window fields', () => {
    const rule: QuotaRule = { route: '/api/items', maxRequests: 100, windowMs: 60000 };
    const ext = buildQuotaExtension(rule);
    expect(ext['x-quota-limit']).toBe(100);
    expect(ext['x-quota-window-ms']).toBe(60000);
    expect(ext['x-quota-exceeded']).toBeUndefined();
  });

  it('includes exceeded flag when status is provided', () => {
    const rule: QuotaRule = { route: '/api/items', maxRequests: 5, windowMs: 1000 };
    const status: QuotaStatus = {
      route: '/api/items',
      method: 'GET',
      count: 7,
      limit: 5,
      exceeded: true,
      resetAt: Date.now() + 1000,
    };
    const ext = buildQuotaExtension(rule, status);
    expect(ext['x-quota-exceeded']).toBe(true);
  });
});

describe('applyQuotasToDocument', () => {
  it('adds quota extensions to matched operations', () => {
    const doc = makeDoc();
    const rules: QuotaRule[] = [{ route: '/api/items', maxRequests: 50, windowMs: 30000 }];
    const result = applyQuotasToDocument(doc, rules);
    const op = result.paths?.['/api/items']?.get as Record<string, unknown>;
    expect(op?.['x-quota-limit']).toBe(50);
    expect(op?.['x-quota-window-ms']).toBe(30000);
  });

  it('does not modify unmatched paths', () => {
    const doc = makeDoc({
      paths: {
        '/api/other': { get: { responses: { '200': { description: 'OK' } } } },
      },
    });
    const rules: QuotaRule[] = [{ route: '/api/items', maxRequests: 50, windowMs: 30000 }];
    const result = applyQuotasToDocument(doc, rules);
    const op = result.paths?.['/api/other']?.get as Record<string, unknown>;
    expect(op?.['x-quota-limit']).toBeUndefined();
  });

  it('returns doc unchanged when paths is missing', () => {
    const doc = makeDoc({ paths: undefined });
    const rules: QuotaRule[] = [{ route: '/api/items', maxRequests: 10, windowMs: 5000 }];
    const result = applyQuotasToDocument(doc, rules);
    expect(result.paths).toBeUndefined();
  });

  it('includes exceeded status from statuses map', () => {
    const doc = makeDoc();
    const rules: QuotaRule[] = [{ route: '/api/items', maxRequests: 3, windowMs: 60000 }];
    const statuses = new Map<string, QuotaStatus>([
      ['GET:/api/items', { route: '/api/items', method: 'GET', count: 5, limit: 3, exceeded: true, resetAt: 0 }],
    ]);
    const result = applyQuotasToDocument(doc, rules, statuses);
    const op = result.paths?.['/api/items']?.get as Record<string, unknown>;
    expect(op?.['x-quota-exceeded']).toBe(true);
  });
});
