import { OpenAPIObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import {
  computeBaseline,
  compareToBaseline,
  BaselineSnapshot,
} from '../traffic/baseline';

export interface BaselineExtension {
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  requestCount: number;
  regressions?: {
    latency: boolean;
    errorRate: boolean;
  };
}

export function buildBaselineExtension(
  current: TrafficEntry[],
  prior?: BaselineSnapshot
): Record<string, BaselineExtension> {
  const snapshot = computeBaseline(current);
  const result: Record<string, BaselineExtension> = {};

  for (const [key, stats] of Object.entries(snapshot.routes)) {
    const ext: BaselineExtension = {
      avgLatency: stats.avgLatency,
      p95Latency: stats.p95Latency,
      errorRate: stats.errorRate,
      requestCount: stats.requestCount,
    };

    if (prior?.routes[key]) {
      const { latencyRegressed, errorRateRegressed } = compareToBaseline(
        stats,
        prior.routes[key]
      );
      ext.regressions = { latency: latencyRegressed, errorRate: errorRateRegressed };
    }

    result[key] = ext;
  }

  return result;
}

export function applyBaselineToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  prior?: BaselineSnapshot
): OpenAPIObject {
  const extensions = buildBaselineExtension(entries, prior);

  const paths = doc.paths ?? {};
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const) {
      const op = (pathItem as Record<string, unknown>)[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      const key = `${method.toUpperCase()}:${pathKey}`;
      if (extensions[key]) {
        op['x-baseline'] = extensions[key];
      }
    }
  }

  return doc;
}
