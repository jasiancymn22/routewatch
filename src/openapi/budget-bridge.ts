import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts/oas30';
import { TrafficEntry } from '../traffic/types';
import { BudgetRule, BudgetViolation, checkBudget, groupViolationsByRoute } from '../traffic/budget';

export function buildBudgetExtension(
  violations: BudgetViolation[]
): Record<string, unknown> {
  return {
    'x-budget-violations': violations.map((v) => ({
      method: v.method,
      rule: v.rule,
      actual: Math.round(v.actual * 1000) / 1000,
      limit: v.limit,
    })),
  };
}

export function applyBudgetToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  rules: BudgetRule[]
): OpenAPIObject {
  const violations = checkBudget(entries, rules);
  const byRoute = groupViolationsByRoute(violations);

  const paths = doc.paths ?? {};

  for (const [route, routeViolations] of Object.entries(byRoute)) {
    const pathItem: PathItemObject = paths[route] ?? {};

    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const) {
      const op = pathItem[method] as OperationObject | undefined;
      if (!op) continue;

      const methodViolations = routeViolations.filter(
        (v) => v.method === '*' || v.method.toLowerCase() === method
      );
      if (methodViolations.length === 0) continue;

      pathItem[method] = {
        ...op,
        ...buildBudgetExtension(methodViolations),
      } as OperationObject;
    }

    paths[route] = pathItem;
  }

  const totalViolations = violations.length;
  return {
    ...doc,
    paths,
    info: {
      ...doc.info,
      'x-budget-violation-count': totalViolations,
    } as OpenAPIObject['info'],
  };
}
