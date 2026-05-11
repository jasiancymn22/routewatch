export interface RequestRecord {
  method: string;
  path: string;
  statusCode: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  queryParams: Record<string, string>;
  pathParams: Record<string, string>;
  timestamp: number;
  durationMs: number;
}

export interface TrafficSample {
  method: string;
  path: string;
  normalizedPath: string;
  samples: RequestRecord[];
}

export type TrafficStore = Map<string, TrafficSample>;

export interface RecorderOptions {
  maxSamplesPerRoute?: number;
  ignoreRoutes?: (string | RegExp)[];
  captureRequestBody?: boolean;
  captureResponseBody?: boolean;
}
