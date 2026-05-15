import { OpenAPIObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { detectRetries, retryStats } from '../traffic/retry';

export interface RetryExtensionMap {
  [routeKey: string]: {
    'x-retry-count': number;
    'x-retry-avg-delay-ms': number;
    'x-retry-success-rate'?: number;
  };
}

export function buildRetryExtensions(entries: TrafficEntry[]): RetryExtensionMap {
  const groups = detectRetries(entries);
  const result: RetryExtensionMap = {};

  for (const [key, retryGroups] of Object.entries(groups)) {
    if (!retryGroups || retryGroups.length === 0) continue;

    const stats = retryStats(retryGroups);
    if (stats.totalRetries === 0) continue;

    result[key] = {
      'x-retry-count': stats.totalRetries,
      'x-retry-avg-delay-ms': Math.round(stats.avgDelay),
    };

    if (stats.successRate !== undefined) {
      result[key]['x-retry-success-rate'] = parseFloat(stats.successRate.toFixed(3));
    }
  }

  return result;
}

export function applyRetriesToDocument(
  doc: OpenAPIObject,
  extensions: RetryExtensionMap
): OpenAPIObject {
  if (!doc.paths || Object.keys(extensions).length === 0) return doc;

  const updatedPaths = { ...doc.paths };

  for (const [routeKey, ext] of Object.entries(extensions)) {
    const spaceIdx = routeKey.indexOf(' ');
    if (spaceIdx === -1) continue;

    const method = routeKey.slice(0, spaceIdx).toLowerCase();
    const path = routeKey.slice(spaceIdx + 1);

    if (!updatedPaths[path] || !updatedPaths[path][method]) continue;

    updatedPaths[path] = {
      ...updatedPaths[path],
      [method]: {
        ...updatedPaths[path][method],
        ...ext,
      },
    };
  }

  return { ...doc, paths: updatedPaths };
}
