import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts/oas31';
import { TrafficEntry } from '../traffic/types';
import { buildLatencyReport, LatencyBucket } from '../traffic/latency';

export function buildLatencyExtension(bucket: LatencyBucket): Record<string, unknown> {
  return {
    'x-latency': {
      p50: bucket.p50,
      p90: bucket.p90,
      p99: bucket.p99,
      min: bucket.min,
      max: bucket.max,
      mean: bucket.mean,
      sampleCount: bucket.count,
    },
  };
}

export function applyLatencyToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[]
): OpenAPIObject {
  const report = buildLatencyReport(entries);
  const bucketMap = new Map<string, LatencyBucket>();

  for (const bucket of report.buckets) {
    bucketMap.set(`${bucket.method.toUpperCase()}:${bucket.route}`, bucket);
  }

  const paths = doc.paths ?? {};

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const item = pathItem as PathItemObject;
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

    for (const method of methods) {
      const operation = item[method] as OperationObject | undefined;
      if (!operation) continue;

      const bucket = bucketMap.get(`${method.toUpperCase()}:${pathKey}`);
      if (bucket) {
        Object.assign(operation, buildLatencyExtension(bucket));
      }
    }
  }

  return { ...doc, paths };
}
