import { TrafficEntry } from './types';

export interface Fingerprint {
  route: string;
  method: string;
  statusClass: string;
  hasAuth: boolean;
  contentType: string | null;
  queryKeys: string[];
  bodyKeys: string[];
}

export function extractContentType(entry: TrafficEntry): string | null {
  const ct = entry.requestHeaders?.['content-type'] ?? entry.requestHeaders?.['Content-Type'];
  if (!ct) return null;
  return ct.split(';')[0].trim();
}

export function extractBodyKeys(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
  return Object.keys(body as Record<string, unknown>).sort();
}

export function extractQueryKeys(query: unknown): string[] {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return [];
  return Object.keys(query as Record<string, unknown>).sort();
}

export function fingerprintEntry(entry: TrafficEntry): Fingerprint {
  const statusClass = entry.statusCode
    ? `${Math.floor(entry.statusCode / 100)}xx`
    : 'unknown';

  const authHeader =
    entry.requestHeaders?.['authorization'] ??
    entry.requestHeaders?.['Authorization'];

  return {
    route: entry.path,
    method: entry.method.toUpperCase(),
    statusClass,
    hasAuth: !!authHeader,
    contentType: extractContentType(entry),
    queryKeys: extractQueryKeys(entry.query),
    bodyKeys: extractBodyKeys(entry.requestBody),
  };
}

export function fingerprintKey(fp: Fingerprint): string {
  const qk = fp.queryKeys.join(',');
  const bk = fp.bodyKeys.join(',');
  const ct = fp.contentType ?? 'none';
  return `${fp.method}:${fp.route}:${fp.statusClass}:${fp.hasAuth}:${ct}:[${qk}]:[${bk}]`;
}

export function fingerprintEntries(
  entries: TrafficEntry[]
): Map<string, Fingerprint> {
  const map = new Map<string, Fingerprint>();
  for (const entry of entries) {
    const fp = fingerprintEntry(entry);
    const key = fingerprintKey(fp);
    if (!map.has(key)) {
      map.set(key, fp);
    }
  }
  return map;
}
