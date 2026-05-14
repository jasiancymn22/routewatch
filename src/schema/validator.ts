import { OpenAPIV3 } from 'openapi-types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that a value conforms to an inferred JSON schema.
 */
export function validateAgainstSchema(
  value: unknown,
  schema: OpenAPIV3.SchemaObject
): ValidationResult {
  const errors: string[] = [];

  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
      return { valid: false, errors };
    }
    const obj = value as Record<string, unknown>;
    const required = schema.required ?? [];
    for (const key of required) {
      if (!(key in obj)) {
        errors.push(`Missing required property: "${key}"`);
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          const nested = validateAgainstSchema(obj[key], propSchema as OpenAPIV3.SchemaObject);
          errors.push(...nested.errors.map(e => `${key}: ${e}`));
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`Expected array, got ${typeof value}`);
      return { valid: false, errors };
    }
    if (schema.items) {
      value.forEach((item, i) => {
        const nested = validateAgainstSchema(item, schema.items as OpenAPIV3.SchemaObject);
        errors.push(...nested.errors.map(e => `[${i}]: ${e}`));
      });
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`Expected string, got ${typeof value}`);
    }
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number') {
      errors.push(`Expected number, got ${typeof value}`);
    }
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`Expected boolean, got ${typeof value}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Checks whether a schema object appears structurally valid (non-empty, has type or properties).
 */
export function isNonTrivialSchema(schema: OpenAPIV3.SchemaObject): boolean {
  if (!schema || typeof schema !== 'object') return false;
  return !!schema.type || !!schema.properties || !!schema.items;
}
