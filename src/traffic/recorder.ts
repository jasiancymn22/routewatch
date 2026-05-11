import { TrafficStore, RequestRecord, TrafficSample, RecorderOptions } from './types';

const DEFAULT_MAX_SAMPLES = 10;

export function createTrafficStore(): TrafficStore {
  return new Map();
}

export function normalizePath(path: string): string {
  return path.replace(/\/\d+/g, '/{id}').replace(/\/[a-f0-9-]{36}/g, '/{uuid}');
}

export function shouldIgnore(path: string, ignoreRoutes: (string | RegExp)[] = []): boolean {
  return ignoreRoutes.some((pattern) =>
    typeof pattern === 'string' ? path === pattern : pattern.test(path)
  );
}

export function recordRequest(
  store: TrafficStore,
  record: RequestRecord,
  options: RecorderOptions = {}
): void {
  const { maxSamplesPerRoute = DEFAULT_MAX_SAMPLES, ignoreRoutes = [] } = options;

  if (shouldIgnore(record.path, ignoreRoutes)) return;

  const normalizedPath = normalizePath(record.path);
  const key = `${record.method.toUpperCase()}:${normalizedPath}`;

  if (!store.has(key)) {
    const sample: TrafficSample = {
      method: record.method.toUpperCase(),
      path: record.path,
      normalizedPath,
      samples: [],
    };
    store.set(key, sample);
  }

  const sample = store.get(key)!;
  if (sample.samples.length < maxSamplesPerRoute) {
    sample.samples.push(record);
  }
}

export function getTrafficSnapshot(store: TrafficStore): TrafficSample[] {
  return Array.from(store.values());
}
