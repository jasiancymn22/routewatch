import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import { buildTrend, RouteTrend } from '../traffic/trend';

export function buildTrendExtension(trend: RouteTrend): Record<string, unknown> {
  return {
    'x-routewatch-trend': {
      direction: trend.direction,
      changePercent: trend.changePercent,
      points: trend.points.map(p => ({
        timestamp: p.timestamp,
        count: p.count,
        errorRate: Number(p.errorRate.toFixed(4)),
        avgLatency: Math.round(p.avgLatency),
      })),
    },
  };
}

export function applyTrendsToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  bucketMs = 60_000
): OpenAPIObject {
  const trends = buildTrend(entries, bucketMs);
  const trendMap = new Map<string, RouteTrend>();
  for (const trend of trends) {
    trendMap.set(`${trend.method.toUpperCase()}:${trend.route}`, trend);
  }

  const paths = doc.paths ?? {};
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
    for (const method of methods) {
      const operation = (pathItem as PathItemObject)[method] as OperationObject | undefined;
      if (!operation) continue;
      const key = `${method.toUpperCase()}:${pathKey}`;
      const trend = trendMap.get(key);
      if (trend) {
        Object.assign(operation, buildTrendExtension(trend));
      }
    }
  }

  return doc;
}
