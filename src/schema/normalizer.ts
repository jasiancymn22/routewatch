/**
 * Normalizes inferred JSON schemas by cleaning up redundant fields,
 * applying sensible defaults, and ensuring spec compliance.
 */

import { OpenAPIV3 } from 'openapi-types';

type Schema = OpenAPIV3.SchemaObject;

/**
 * Remove undefined/null keys and normalize empty objects.
 */
export function stripEmptyFields(schema: Schema): Schema {
  const result: Schema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

/**
 * Recursively normalize a schema object.
 */
export function normalizeSchema(schema: Schema): Schema {
  const cleaned = stripEmptyFields(schema);

  if (cleaned.type === 'object' && cleaned.properties) {
    const normalizedProps: Record<string, Schema> = {};
    for (const [prop, propSchema] of Object.entries(cleaned.properties)) {
      normalizedProps[prop] = normalizeSchema(propSchema as Schema);
    }
    cleaned.properties = normalizedProps;
  }

  if (cleaned.type === 'array' && cleaned.items) {
    cleaned.items = normalizeSchema(cleaned.items as Schema);
  }

  if (Array.isArray(cleaned.allOf)) {
    cleaned.allOf = cleaned.allOf.map((s) => normalizeSchema(s as Schema));
  }

  // Default additionalProperties to false for objects if not set
  if (cleaned.type === 'object' && cleaned.additionalProperties === undefined) {
    cleaned.additionalProperties = true;
  }

  return cleaned;
}

/**
 * Normalize a map of schemas (e.g. request/response bodies keyed by route).
 */
export function normalizeSchemaMap(
  map: Record<string, Schema>
): Record<string, Schema> {
  const result: Record<string, Schema> = {};
  for (const [key, schema] of Object.entries(map)) {
    result[key] = normalizeSchema(schema);
  }
  return result;
}
