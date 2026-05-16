import { OpenAPIObject, PathItemObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { buildCorrelationMap, getCorrelatedRoutes } from '../traffic/correlation';

export interface CorrelationExtension {
  'x-correlatedRoutes': Array<{
    route: string;
    score: number;
    coOccurrences: number;
  }>;
}

/** Build correlation extension data for a single route */
export function buildCorrelationExtension(
  route: string,
  entries: TrafficEntry[],
  topN: number = 5
): CorrelationExtension {
  const map = buildCorrelationMap(entries);
  const correlated = getCorrelatedRoutes(route, map, topN);
  return {
    'x-correlatedRoutes': correlated.map((p) => ({
      route: p.routeA === route ? p.routeB : p.routeA,
      score: p.correlationScore,
      coOccurrences: p.coOccurrences,
    })),
  };
}

/** Apply correlation extensions to all paths in an OpenAPI document */
export function applyCorrelationsToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  topN: number = 5
): OpenAPIObject {
  if (!doc.paths) return doc;

  const map = buildCorrelationMap(entries);
  const updatedPaths: Record<string, PathItemObject> = {};

  for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
    const updatedItem: PathItemObject = { ...pathItem };

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method];
      if (!operation || typeof operation !== 'object') continue;

      const routeKey = `${method.toUpperCase()}:${pathKey}`;
      const correlated = getCorrelatedRoutes(routeKey, map, topN);

      if (correlated.length > 0) {
        (updatedItem as Record<string, unknown>)[method] = {
          ...(operation as object),
          'x-correlatedRoutes': correlated.map((p) => ({
            route: p.routeA === routeKey ? p.routeB : p.routeA,
            score: p.correlationScore,
            coOccurrences: p.coOccurrences,
          })),
        };
      }
    }

    updatedPaths[pathKey] = updatedItem;
  }

  return { ...doc, paths: updatedPaths };
}
