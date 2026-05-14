import { OpenAPIV3 } from 'openapi-types';

type SchemaObject = OpenAPIV3.SchemaObject;

/**
 * Deeply merges two JSON Schema objects, combining properties,
 * required fields, and widening types when conflicts occur.
 */
export function deepMergeSchemas(
  a: SchemaObject,
  b: SchemaObject
): SchemaObject {
  if (a.type !== b.type) {
    return { oneOf: [a, b] };
  }

  if (a.type === 'object' && b.type === 'object') {
    const aProps = a.properties ?? {};
    const bProps = b.properties ?? {};
    const allKeys = new Set([...Object.keys(aProps), ...Object.keys(bProps)]);

    const merged: Record<string, SchemaObject> = {};
    for (const key of allKeys) {
      if (aProps[key] && bProps[key]) {
        merged[key] = deepMergeSchemas(
          aProps[key] as SchemaObject,
          bProps[key] as SchemaObject
        );
      } else {
        merged[key] = (aProps[key] ?? bProps[key]) as SchemaObject;
      }
    }

    const aRequired = new Set(a.required ?? []);
    const bRequired = new Set(b.required ?? []);
    const required = [...aRequired].filter((k) => bRequired.has(k));

    return {
      type: 'object',
      properties: merged,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  if (a.type === 'array' && b.type === 'array') {
    const aItems = a.items as SchemaObject | undefined;
    const bItems = b.items as SchemaObject | undefined;
    if (aItems && bItems) {
      return { type: 'array', items: deepMergeSchemas(aItems, bItems) };
    }
    return { type: 'array', items: aItems ?? bItems ?? {} };
  }

  return a;
}

/**
 * Merges an array of schemas into a single representative schema.
 */
export function mergeSchemaList(schemas: SchemaObject[]): SchemaObject {
  if (schemas.length === 0) return {};
  return schemas.reduce((acc, schema) => deepMergeSchemas(acc, schema));
}
