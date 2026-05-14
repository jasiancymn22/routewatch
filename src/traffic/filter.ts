import { TrafficEntry } from './types';

export interface FilterOptions {
  methods?: string[];
  pathPattern?: RegExp;
  statusCodes?: number[];
  minRequests?: number;
}

/**
 * Filters traffic entries based on provided options.
 */
export function filterEntries(
  entries: TrafficEntry[],
  options: FilterOptions
): TrafficEntry[] {
  const { methods, pathPattern, statusCodes, minRequests } = options;

  return entries.filter((entry) => {
    if (methods && methods.length > 0) {
      const upperMethods = methods.map((m) => m.toUpperCase());
      if (!upperMethods.includes(entry.method.toUpperCase())) {
        return false;
      }
    }

    if (pathPattern && !pathPattern.test(entry.path)) {
      return false;
    }

    if (statusCodes && statusCodes.length > 0) {
      const responseCodes = entry.responses.map((r) => r.statusCode);
      const hasMatch = statusCodes.some((code) => responseCodes.includes(code));
      if (!hasMatch) {
        return false;
      }
    }

    if (minRequests !== undefined && entry.requestCount < minRequests) {
      return false;
    }

    return true;
  });
}

/**
 * Groups traffic entries by HTTP method.
 */
export function groupByMethod(
  entries: TrafficEntry[]
): Record<string, TrafficEntry[]> {
  return entries.reduce<Record<string, TrafficEntry[]>>((acc, entry) => {
    const method = entry.method.toUpperCase();
    if (!acc[method]) {
      acc[method] = [];
    }
    acc[method].push(entry);
    return acc;
  }, {});
}

/**
 * Sorts entries by request count descending.
 */
export function sortByFrequency(entries: TrafficEntry[]): TrafficEntry[] {
  return [...entries].sort((a, b) => b.requestCount - a.requestCount);
}
