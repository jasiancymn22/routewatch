import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { computeRateMap, getRequestRate, RouteRateMap } from '../traffic/rate';

export interface RateExtension {
  'x-request-rate'?: number;
  'x-rate-window-ms'?: number;
}

export function buildRateExtensions(
  method: string,
  path: string,
  rateMap: RouteRateMap
): RateExtension {
  const key = `${method.toUpperCase()}:${path}`;
  const window = rateMap[key];
  if (!window) return {};
  return {
    'x-request-rate': Math.round(getRequestRate(window) * 100) / 100,
    'x-rate-window-ms': window.windowMs,
  };
}

export function applyRatesToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  windowMs = 60_000
): OpenAPIObject {
  const rateMap = computeRateMap(entries, windowMs);
  const paths = doc.paths ?? {};

  const updatedPaths: Record<string, PathItemObject> = {};

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const updatedItem: PathItemObject = { ...pathItem };
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method] as OperationObject | undefined;
      if (operation) {
        const extensions = buildRateExtensions(method, pathKey, rateMap);
        (updatedItem as Record<string, unknown>)[method] = { ...operation, ...extensions };
      }
    }

    updatedPaths[pathKey] = updatedItem;
  }

  return { ...doc, paths: updatedPaths };
}
