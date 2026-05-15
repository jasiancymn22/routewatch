import { OpenAPIV3 } from "openapi-types";
import { AnnotationMap, getAnnotation } from "../traffic/annotator";

/**
 * Enriches an OpenAPI document's operation objects with annotations
 * sourced from a traffic AnnotationMap.
 */
export function applyAnnotationsToDocument(
  doc: OpenAPIV3.Document,
  annotations: AnnotationMap
): OpenAPIV3.Document {
  const paths: OpenAPIV3.PathsObject = {};

  for (const [routePath, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) {
      paths[routePath] = pathItem;
      continue;
    }

    const methods: Array<OpenAPIV3.HttpMethods> = [
      "get", "post", "put", "patch", "delete", "head", "options", "trace",
    ] as Array<OpenAPIV3.HttpMethods>;

    const updatedItem: OpenAPIV3.PathItemObject = { ...pathItem };

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method] as
        | OpenAPIV3.OperationObject
        | undefined;
      if (!operation) continue;

      const annotation = getAnnotation(annotations, method, routePath);
      if (!annotation) continue;

      const updated: OpenAPIV3.OperationObject = { ...operation };

      if (annotation.tags?.length) {
        updated.tags = [...new Set([...(updated.tags ?? []), ...annotation.tags])];
      }
      if (annotation.summary) updated.summary = annotation.summary;
      if (annotation.description) updated.description = annotation.description;
      if (annotation.deprecated !== undefined) updated.deprecated = annotation.deprecated;

      (updatedItem as Record<string, unknown>)[method] = updated;
    }

    paths[routePath] = updatedItem;
  }

  return { ...doc, paths };
}
