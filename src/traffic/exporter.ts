import { TrafficEntry } from './types';

export type TrafficExportFormat = 'json' | 'ndjson';

export interface TrafficExportOptions {
  format?: TrafficExportFormat;
  pretty?: boolean;
}

export function serializeEntries(
  entries: TrafficEntry[],
  options: TrafficExportOptions = {}
): string {
  const { format = 'json', pretty = false } = options;

  if (format === 'ndjson') {
    return entries.map((e) => JSON.stringify(e)).join('\n');
  }

  return pretty
    ? JSON.stringify(entries, null, 2)
    : JSON.stringify(entries);
}

export function deserializeEntries(raw: string, format: TrafficExportFormat = 'json'): TrafficEntry[] {
  if (format === 'ndjson') {
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as TrafficEntry);
  }
  return JSON.parse(raw) as TrafficEntry[];
}

export function entriestoCSVHeader(): string {
  return 'method,path,statusCode,timestamp';
}

export function entryToCSVRow(entry: TrafficEntry): string {
  return [
    entry.method,
    entry.path,
    entry.statusCode,
    entry.timestamp,
  ].join(',');
}

export function serializeToCSV(entries: TrafficEntry[]): string {
  const rows = entries.map(entryToCSVRow);
  return [entriestoCSVHeader(), ...rows].join('\n');
}
