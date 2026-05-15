import { OpenAPIObject, PathItemObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import {
  detectDependencies,
  buildDependencyMap,
  RouteDependency,
} from '../traffic/dependency';

export function buildDependencyExtension(
  deps: RouteDependency[]
): Record<string, unknown> {
  return {
    'x-routewatch-dependencies': deps.map(d => ({
      from: d.from,
      to: d.to,
      count: d.count,
      avgGapMs: d.avgGapMs,
    })),
  };
}

export function applyDependenciesToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  windowMs = 500
): OpenAPIObject {
  const deps = detectDependencies(entries, windowMs);
  const depMap = buildDependencyMap(deps);

  const paths = doc.paths ?? {};

  for (const [routeKey, routeDeps] of Object.entries(depMap)) {
    const [method, path] = routeKey.split(':');
    if (!path || !method) continue;

    const pathItem: PathItemObject = paths[path] ?? {};
    const operation = (pathItem as Record<string, unknown>)[method.toLowerCase()] as
      | Record<string, unknown>
      | undefined;

    if (!operation) continue;

    operation['x-routewatch-leads-to'] = routeDeps.map(d => ({
      route: d.to,
      count: d.count,
      avgGapMs: d.avgGapMs,
    }));
  }

  const allDepsExt = buildDependencyExtension(deps);

  return {
    ...doc,
    paths,
    info: {
      ...doc.info,
      ...allDepsExt,
    },
  };
}
