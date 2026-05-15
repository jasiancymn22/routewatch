import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { profileEntries, RouteProfile } from '../traffic/profiler';

const X_PROFILE = 'x-routewatch-profile';

export function buildProfileExtension(
  profile: RouteProfile
): Record<string, unknown> {
  return {
    avgDuration: Math.round(profile.avgDuration),
    minDuration: profile.minDuration,
    maxDuration: profile.maxDuration,
    p50: profile.p50,
    p95: profile.p95,
    p99: profile.p99,
    sampleCount: profile.sampleCount,
  };
}

export function applyProfilesToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[]
): OpenAPIObject {
  const trafficProfile = profileEntries(entries);
  const profileMap = new Map<string, RouteProfile>();

  for (const route of trafficProfile.routes) {
    profileMap.set(`${route.method.toLowerCase()}:${route.path}`, route);
  }

  const paths = doc.paths ?? {};

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
    for (const method of methods) {
      const operation = (pathItem as PathItemObject)[method] as OperationObject | undefined;
      if (!operation) continue;

      const profile = profileMap.get(`${method}:${pathKey}`);
      if (profile) {
        operation[X_PROFILE] = buildProfileExtension(profile);
      }
    }
  }

  return {
    ...doc,
    [X_PROFILE + '-summary']: {
      totalRequests: trafficProfile.totalRequests,
      generatedAt: trafficProfile.generatedAt,
    },
  };
}
