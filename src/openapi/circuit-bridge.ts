/**
 * Bridge between the circuit breaker store and OpenAPI document extensions.
 * Adds x-circuit-breaker extensions to path/method operations.
 */

import type { OpenAPIObject, PathItemObject, OperationObject } from "openapi3-ts/oas30";
import { getOpenCircuits, CircuitStore, CircuitState } from "../traffic/circuit";

export interface CircuitExtension {
  "x-circuit-breaker": {
    isOpen: boolean;
    errorRate: number;
    totalRequests: number;
    openedAt?: number;
  };
}

export function buildCircuitExtension(state: CircuitState): CircuitExtension {
  return {
    "x-circuit-breaker": {
      isOpen: state.isOpen,
      errorRate: Math.round(state.errorRate * 1000) / 1000,
      totalRequests: state.totalRequests,
      ...(state.openedAt !== undefined ? { openedAt: state.openedAt } : {}),
    },
  };
}

export function applyCircuitsToDocument(
  doc: OpenAPIObject,
  store: CircuitStore
): OpenAPIObject {
  const openCircuits = getOpenCircuits(store);
  if (openCircuits.length === 0) return doc;

  const paths = { ...(doc.paths ?? {}) } as Record<string, PathItemObject>;

  for (const state of openCircuits) {
    const pathItem = paths[state.route];
    if (!pathItem) continue;

    const method = state.method.toLowerCase() as keyof PathItemObject;
    const operation = pathItem[method] as OperationObject | undefined;
    if (!operation) continue;

    (paths[state.route] as Record<string, unknown>)[method] = {
      ...operation,
      ...buildCircuitExtension(state),
    };
  }

  return { ...doc, paths };
}
