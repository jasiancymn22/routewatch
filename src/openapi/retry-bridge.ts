import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { retryStats, groupRetries } from '../traffic/retry';

export interface RetryExtension {
  'x-retry-count': number;
  'x-retry-success-rate': number;
  'x-retry-detected': boolean;
}

export function buildRetryExtensions(
  entries: TrafficEntry[],
  windowMs = 5000
): Record<string, RetryExtension> {
  const stats = retryStats(entries, windowMs);
  const result: Record<string, RetryExtension> = {};

  for (const [key, s] of Object.entries(stats)) {
    result[key] = {
      'x-retry-count': s.retries,
      'x-retry-success-rate': parseFloat(s.successRate.toFixed(3)),
      'x-retry-detected': s.retries > 0,
    };
  }

  return result;
}

export function applyRetriesToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  windowMs = 5000
): OpenAPIObject {
  const extensions = buildRetryExtensions(entries, windowMs);

  if (!doc.paths) return doc;

  const updatedPaths: Record<string, PathItemObject> = {};

  for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
    const updatedPath: PathItemObject = { ...pathItem };
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method] as OperationObject | undefined;
      if (!operation) continue;

      const extKey = `${method.toUpperCase()}:${pathKey}`;
      const ext = extensions[extKey];

      if (ext) {
        (updatedPath as Record<string, unknown>)[method] = {
          ...operation,
          ...ext,
        };
      }
    }

    updatedPaths[pathKey] = updatedPath;
  }

  return { ...doc, paths: updatedPaths };
}
