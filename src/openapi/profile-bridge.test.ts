import { applyProfilesToDocument, buildProfileExtension } from './profile-bridge';
import { OpenAPIObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    timestamp: Date.now(),
    duration: 100,
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

describe('buildProfileExtension', () => {
  it('includes all latency fields', () => {
    const ext = buildProfileExtension({
      method: 'GET',
      path: '/a',
      avgDuration: 55.5,
      minDuration: 10,
      maxDuration: 100,
      p50: 50,
      p95: 95,
      p99: 99,
      sampleCount: 20,
    });
    expect(ext.avgDuration).toBe(56);
    expect(ext.p95).toBe(95);
    expect(ext.sampleCount).toBe(20);
  });
});

describe('applyProfilesToDocument', () => {
  it('attaches profile to matching operation', () => {
    const entries = [
      makeEntry({ duration: 80 }),
      makeEntry({ duration: 120 }),
    ];
    const doc = makeDoc({
      paths: {
        '/api/users': {
          get: { responses: { '200': { description: 'OK' } } },
        },
      },
    });
    const result = applyProfilesToDocument(doc, entries);
    const op = result.paths!['/api/users']!.get as any;
    expect(op['x-routewatch-profile']).toBeDefined();
    expect(op['x-routewatch-profile'].sampleCount).toBe(2);
  });

  it('adds summary extension to document', () => {
    const result = applyProfilesToDocument(makeDoc(), [makeEntry()]);
    const summary = (result as any)['x-routewatch-profile-summary'];
    expect(summary.totalRequests).toBe(1);
    expect(summary.generatedAt).toBeDefined();
  });

  it('does not attach profile when no matching entries', () => {
    const doc = makeDoc({
      paths: {
        '/api/other': {
          post: { responses: { '201': { description: 'Created' } } },
        },
      },
    });
    const result = applyProfilesToDocument(doc, [makeEntry()]);
    const op = result.paths!['/api/other']!.post as any;
    expect(op['x-routewatch-profile']).toBeUndefined();
  });
});
