import { TrafficEntry } from '../traffic/types';

export interface SchemaProperty {
  type: string;
  example?: unknown;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
}

export interface InferredSchema {
  type: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  example?: unknown;
}

export function inferType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function inferSchema(value: unknown): InferredSchema {
  if (value === null) return { type: 'null' };

  if (Array.isArray(value)) {
    const itemSchema = value.length > 0 ? inferSchema(value[0]) : { type: 'object' };
    return { type: 'array', items: itemSchema };
  }

  if (typeof value === 'object') {
    const properties: Record<string, SchemaProperty> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      properties[key] = { ...inferSchema(val), example: val } as SchemaProperty;
    }
    return { type: 'object', properties };
  }

  return { type: inferType(value), example: value };
}

export function mergeSchemas(a: InferredSchema, b: InferredSchema): InferredSchema {
  if (a.type !== b.type) {
    return { type: 'object' };
  }

  if (a.type === 'object' && a.properties && b.properties) {
    const merged: Record<string, SchemaProperty> = { ...a.properties };
    for (const [key, prop] of Object.entries(b.properties)) {
      if (merged[key]) {
        merged[key] = mergeSchemas(merged[key], prop) as SchemaProperty;
      } else {
        merged[key] = prop;
      }
    }
    return { type: 'object', properties: merged };
  }

  return a;
}

export function inferFromTrafficEntries(entries: TrafficEntry[]): {
  requestBody?: InferredSchema;
  responseBody?: InferredSchema;
} {
  let requestSchema: InferredSchema | undefined;
  let responseSchema: InferredSchema | undefined;

  for (const entry of entries) {
    if (entry.requestBody) {
      const s = inferSchema(entry.requestBody);
      requestSchema = requestSchema ? mergeSchemas(requestSchema, s) : s;
    }
    if (entry.responseBody) {
      const s = inferSchema(entry.responseBody);
      responseSchema = responseSchema ? mergeSchemas(responseSchema, s) : s;
    }
  }

  return { requestBody: requestSchema, responseBody: responseSchema };
}
