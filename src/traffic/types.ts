export interface TrafficEntry {
  method: string;
  path: string;
  statusCode: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  queryParams?: Record<string, string>;
  durationMs?: number;
}

export interface TrafficStore {
  entries: TrafficEntry[];
  ignorePaths: string[];
  maxEntries: number;
}

export interface TrafficSnapshot {
  entries: TrafficEntry[];
  capturedAt: number;
  totalCount: number;
}
