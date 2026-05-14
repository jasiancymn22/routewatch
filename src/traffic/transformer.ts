import { TrafficEntry } from './types';

export interface TransformOptions {
  redactHeaders?: string[];
  redactBodyFields?: string[];
  truncateBodyAt?: number;
}

const DEFAULT_REDACT_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];

export function redactHeaders(
  headers: Record<string, string>,
  redactList: string[] = DEFAULT_REDACT_HEADERS
): Record<string, string> {
  const lower = redactList.map((h) => h.toLowerCase());
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) =>
      lower.includes(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v]
    )
  );
}

export function redactBodyFields(
  body: unknown,
  fields: string[]
): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const result: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const field of fields) {
    if (field in result) result[field] = '[REDACTED]';
  }
  return result;
}

export function truncateBody(body: unknown, maxLength: number): unknown {
  if (typeof body === 'string' && body.length > maxLength) {
    return body.slice(0, maxLength) + '...[truncated]';
  }
  return body;
}

export function transformEntry(
  entry: TrafficEntry,
  options: TransformOptions = {}
): TrafficEntry {
  const {
    redactHeaders: redactList,
    redactBodyFields: bodyFields = [],
    truncateBodyAt,
  } = options;

  let requestBody = entry.requestBody;
  if (bodyFields.length > 0) requestBody = redactBodyFields(requestBody, bodyFields);
  if (truncateBodyAt !== undefined) requestBody = truncateBody(requestBody, truncateBodyAt);

  return {
    ...entry,
    requestHeaders: redactHeaders(entry.requestHeaders ?? {}, redactList),
    responseHeaders: redactHeaders(entry.responseHeaders ?? {}, redactList),
    requestBody,
  };
}

export function transformEntries(
  entries: TrafficEntry[],
  options: TransformOptions = {}
): TrafficEntry[] {
  return entries.map((e) => transformEntry(e, options));
}
