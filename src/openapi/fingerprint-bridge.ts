import { OpenAPIObject, OperationObject, PathItemObject } from 'openapi3-ts/oas30';
import { TrafficEntry } from '../traffic/types';
import { fingerprintEntries, fingerprintKey, Fingerprint } from '../traffic/fingerprint';

export interface FingerprintExtension {
  'x-fingerprints': string[];
  'x-variant-count': number;
}

export function buildFingerprintExtension(
  entries: TrafficEntry[]
): FingerprintExtension {
  const fpMap = fingerprintEntries(entries);
  const keys = Array.from(fpMap.keys());
  return {
    'x-fingerprints': keys,
    'x-variant-count': keys.length,
  };
}

export function groupFingerprintsByRoute(
  entries: TrafficEntry[]
): Map<string, Map<string, Fingerprint>> {
  const result = new Map<string, Map<string, Fingerprint>>();
  for (const entry of entries) {
    const routeKey = `${entry.method.toUpperCase()}:${entry.path}`;
    if (!result.has(routeKey)) {
      result.set(routeKey, new Map());
    }
    const { fingerprintEntry, fingerprintKey: fk } = require('../traffic/fingerprint');
    const fp = fingerprintEntry(entry);
    const key = fk(fp);
    result.get(routeKey)!.set(key, fp);
  }
  return result;
}

export function applyFingerprintsToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[]
): OpenAPIObject {
  if (!doc.paths) return doc;

  const byRoute = new Map<string, TrafficEntry[]>();
  for (const entry of entries) {
    const key = `${entry.method.toUpperCase()}:${entry.path}`;
    if (!byRoute.has(key)) byRoute.set(key, []);
    byRoute.get(key)!.push(entry);
  }

  const newPaths: Record<string, PathItemObject> = {};

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    const newPathItem: PathItemObject = { ...pathItem };
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

    for (const method of methods) {
      const op = (pathItem as Record<string, unknown>)[method] as OperationObject | undefined;
      if (!op) continue;

      const key = `${method.toUpperCase()}:${path}`;
      const routeEntries = byRoute.get(key) ?? [];
      if (routeEntries.length === 0) continue;

      const ext = buildFingerprintExtension(routeEntries);
      (newPathItem as Record<string, unknown>)[method] = { ...op, ...ext };
    }

    newPaths[path] = newPathItem;
  }

  return { ...doc, paths: newPaths };
}
