import { TrafficEntry } from './types';

export type RouteCategory = 'read' | 'write' | 'delete' | 'other';

export interface ClassifiedEntry {
  entry: TrafficEntry;
  category: RouteCategory;
  isAuthenticated: boolean;
  isErrorResponse: boolean;
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const DELETE_METHODS = new Set(['DELETE']);

export function classifyMethod(method: string): RouteCategory {
  const upper = method.toUpperCase();
  if (READ_METHODS.has(upper)) return 'read';
  if (WRITE_METHODS.has(upper)) return 'write';
  if (DELETE_METHODS.has(upper)) return 'delete';
  return 'other';
}

export function isAuthenticated(entry: TrafficEntry): boolean {
  const headers = entry.requestHeaders ?? {};
  return (
    'authorization' in headers ||
    'x-api-key' in headers ||
    'cookie' in headers
  );
}

export function isErrorResponse(entry: TrafficEntry): boolean {
  return entry.statusCode >= 400;
}

export function classifyEntry(entry: TrafficEntry): ClassifiedEntry {
  return {
    entry,
    category: classifyMethod(entry.method),
    isAuthenticated: isAuthenticated(entry),
    isErrorResponse: isErrorResponse(entry),
  };
}

export function classifyEntries(entries: TrafficEntry[]): ClassifiedEntry[] {
  return entries.map(classifyEntry);
}

export function groupByCategory(
  classified: ClassifiedEntry[]
): Record<RouteCategory, ClassifiedEntry[]> {
  const result: Record<RouteCategory, ClassifiedEntry[]> = {
    read: [],
    write: [],
    delete: [],
    other: [],
  };
  for (const item of classified) {
    result[item.category].push(item);
  }
  return result;
}
