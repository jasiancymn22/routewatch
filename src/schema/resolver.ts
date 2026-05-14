/**
 * Resolves $ref references within an OpenAPI schema object,
 * replacing inline $ref strings with the referenced schema definitions.
 */

import { OpenAPIV3 } from 'openapi-types';

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type SchemaOrRef = SchemaObject | ReferenceObject;

export function isReferenceObject(schema: SchemaOrRef): schema is ReferenceObject {
  return '$ref' in schema;
}

export function resolveRef(
  ref: string,
  components: Record<string, SchemaObject>
): SchemaObject | undefined {
  // Expects refs like "#/components/schemas/Foo"
  const parts = ref.replace(/^#\//, '').split('/');
  // We only resolve simple #/components/schemas/<Name> refs
  if (parts.length === 3 && parts[0] === 'components' && parts[1] === 'schemas') {
    return components[parts[2]];
  }
  return undefined;
}

export function resolveSchema(
  schema: SchemaOrRef,
  components: Record<string, SchemaObject>,
  visited: Set<string> = new Set()
): SchemaObject {
  if (isReferenceObject(schema)) {
    if (visited.has(schema.$ref)) {
      // Circular ref guard — return empty object to break cycle
      return {};
    }
    visited.add(schema.$ref);
    const resolved = resolveRef(schema.$ref, components);
    if (!resolved) return {};
    return resolveSchema(resolved, components, visited);
  }

  const result: SchemaObject = { ...schema };

  if (result.properties) {
    const resolvedProps: Record<string, SchemaObject> = {};
    for (const [key, prop] of Object.entries(result.properties)) {
      resolvedProps[key] = resolveSchema(prop as SchemaOrRef, components, new Set(visited));
    }
    result.properties = resolvedProps;
  }

  if (result.items) {
    result.items = resolveSchema(result.items as SchemaOrRef, components, new Set(visited));
  }

  if (result.allOf) {
    result.allOf = result.allOf.map((s) =>
      resolveSchema(s as SchemaOrRef, components, new Set(visited))
    );
  }

  return result;
}

export function resolveSchemaMap(
  schemas: Record<string, SchemaOrRef>,
  components: Record<string, SchemaObject>
): Record<string, SchemaObject> {
  const resolved: Record<string, SchemaObject> = {};
  for (const [key, schema] of Object.entries(schemas)) {
    resolved[key] = resolveSchema(schema, components);
  }
  return resolved;
}
