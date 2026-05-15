/**
 * Circuit breaker for traffic recording — tracks error rates per route
 * and marks routes as "open" (degraded) when error threshold is exceeded.
 */

export interface CircuitState {
  route: string;
  method: string;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  isOpen: boolean;
  openedAt?: number;
}

export interface CircuitStore {
  states: Map<string, CircuitState>;
  errorThreshold: number; // 0–1, e.g. 0.5 = 50%
  minRequests: number;    // minimum requests before circuit can open
  resetWindowMs: number;  // ms after which an open circuit resets
}

export function createCircuitStore(
  errorThreshold = 0.5,
  minRequests = 5,
  resetWindowMs = 60_000
): CircuitStore {
  return { states: new Map(), errorThreshold, minRequests, resetWindowMs };
}

export function circuitKey(method: string, route: string): string {
  return `${method.toUpperCase()}:${route}`;
}

export function recordCircuitEvent(
  store: CircuitStore,
  method: string,
  route: string,
  isError: boolean,
  now = Date.now()
): CircuitState {
  const key = circuitKey(method, route);
  const existing = store.states.get(key) ?? {
    route,
    method: method.toUpperCase(),
    totalRequests: 0,
    errorCount: 0,
    errorRate: 0,
    isOpen: false,
  };

  const totalRequests = existing.totalRequests + 1;
  const errorCount = existing.errorCount + (isError ? 1 : 0);
  const errorRate = errorCount / totalRequests;

  let isOpen = existing.isOpen;
  let openedAt = existing.openedAt;

  // Reset if window has passed
  if (isOpen && openedAt !== undefined && now - openedAt >= store.resetWindowMs) {
    isOpen = false;
    openedAt = undefined;
  }

  // Open circuit if threshold exceeded
  if (!isOpen && totalRequests >= store.minRequests && errorRate >= store.errorThreshold) {
    isOpen = true;
    openedAt = now;
  }

  const next: CircuitState = { route, method: method.toUpperCase(), totalRequests, errorCount, errorRate, isOpen, openedAt };
  store.states.set(key, next);
  return next;
}

export function getCircuitState(store: CircuitStore, method: string, route: string): CircuitState | undefined {
  return store.states.get(circuitKey(method, route));
}

export function getOpenCircuits(store: CircuitStore): CircuitState[] {
  return Array.from(store.states.values()).filter(s => s.isOpen);
}

export function resetCircuit(store: CircuitStore, method: string, route: string): void {
  store.states.delete(circuitKey(method, route));
}
