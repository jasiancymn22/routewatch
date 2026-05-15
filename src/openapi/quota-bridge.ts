import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts/oas30';
import { QuotaRule, QuotaStatus } from '../traffic/quota';

export interface QuotaExtension {
  'x-quota-limit': number;
  'x-quota-window-ms': number;
  'x-quota-exceeded'?: boolean;
}

export function buildQuotaExtension(
  rule: QuotaRule,
  status?: QuotaStatus
): QuotaExtension {
  return {
    'x-quota-limit': rule.maxRequests,
    'x-quota-window-ms': rule.windowMs,
    ...(status ? { 'x-quota-exceeded': status.exceeded } : {}),
  };
}

export function applyQuotasToDocument(
  doc: OpenAPIObject,
  rules: QuotaRule[],
  statuses: Map<string, QuotaStatus> = new Map()
): OpenAPIObject {
  if (!doc.paths) return doc;

  const updatedPaths: Record<string, PathItemObject> = {};

  for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
    const updatedPath: PathItemObject = { ...pathItem };
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method] as OperationObject | undefined;
      if (!operation) continue;

      const matchingRule = rules.find(
        r => r.route === pathKey && (!r.method || r.method.toUpperCase() === method.toUpperCase())
      );

      if (matchingRule) {
        const statusKey = `${method.toUpperCase()}:${pathKey}`;
        const status = statuses.get(statusKey);
        const ext = buildQuotaExtension(matchingRule, status);
        (updatedPath as Record<string, unknown>)[method] = { ...operation, ...ext };
      }
    }

    updatedPaths[pathKey] = updatedPath;
  }

  return { ...doc, paths: updatedPaths };
}
