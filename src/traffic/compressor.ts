import { TrafficEntry } from './types';

export interface CompressedSnapshot {
  version: 1;
  timestamp: number;
  count: number;
  entries: CompressedEntry[];
}

export interface CompressedEntry {
  m: string;       // method
  p: string;       // path
  s: number;       // statusCode
  t: number;       // timestamp
  d?: number;      // duration
  q?: Record<string, string>; // query
  b?: unknown;     // requestBody
  r?: unknown;     // responseBody
  h?: Record<string, string>; // headers (selected)
}

const HEADER_ALLOWLIST = ['content-type', 'accept', 'authorization'];

function compressEntry(entry: TrafficEntry): CompressedEntry {
  const compressed: CompressedEntry = {
    m: entry.method,
    p: entry.path,
    s: entry.statusCode,
    t: entry.timestamp,
  };
  if (entry.duration !== undefined) compressed.d = entry.duration;
  if (entry.query && Object.keys(entry.query).length > 0) compressed.q = entry.query;
  if (entry.requestBody !== undefined) compressed.b = entry.requestBody;
  if (entry.responseBody !== undefined) compressed.r = entry.responseBody;
  if (entry.headers) {
    const filtered: Record<string, string> = {};
    for (const key of HEADER_ALLOWLIST) {
      if (entry.headers[key]) filtered[key] = entry.headers[key];
    }
    if (Object.keys(filtered).length > 0) compressed.h = filtered;
  }
  return compressed;
}

function decompressEntry(c: CompressedEntry): TrafficEntry {
  return {
    method: c.m,
    path: c.p,
    statusCode: c.s,
    timestamp: c.t,
    ...(c.d !== undefined ? { duration: c.d } : {}),
    ...(c.q ? { query: c.q } : {}),
    ...(c.b !== undefined ? { requestBody: c.b } : {}),
    ...(c.r !== undefined ? { responseBody: c.r } : {}),
    ...(c.h ? { headers: c.h } : {}),
  };
}

export function compressEntries(entries: TrafficEntry[]): CompressedSnapshot {
  return {
    version: 1,
    timestamp: Date.now(),
    count: entries.length,
    entries: entries.map(compressEntry),
  };
}

export function decompressSnapshot(snapshot: CompressedSnapshot): TrafficEntry[] {
  if (snapshot.version !== 1) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`);
  }
  return snapshot.entries.map(decompressEntry);
}

export function serializeSnapshot(snapshot: CompressedSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeSnapshot(raw: string): CompressedSnapshot {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error('Invalid snapshot format');
  }
  return parsed as CompressedSnapshot;
}
