import { TrafficEntry } from './types';

export interface QuotaRule {
  route: string;
  method?: string;
  maxRequests: number;
  windowMs: number;
}

export interface QuotaStatus {
  route: string;
  method: string;
  count: number;
  limit: number;
  exceeded: boolean;
  resetAt: number;
}

export interface QuotaWindow {
  count: number;
  startMs: number;
}

export type QuotaStore = Map<string, QuotaWindow>;

export function createQuotaStore(): QuotaStore {
  return new Map();
}

export function quotaKey(route: string, method: string): string {
  return `${method.toUpperCase()}:${route}`;
}

export function checkQuota(
  store: QuotaStore,
  rule: QuotaRule,
  entry: TrafficEntry,
  nowMs: number = Date.now()
): QuotaStatus {
  const method = rule.method ?? entry.method;
  const key = quotaKey(rule.route, method);
  const existing = store.get(key);

  let window: QuotaWindow;
  if (!existing || nowMs - existing.startMs > rule.windowMs) {
    window = { count: 0, startMs: nowMs };
  } else {
    window = existing;
  }

  window.count += 1;
  store.set(key, window);

  return {
    route: rule.route,
    method,
    count: window.count,
    limit: rule.maxRequests,
    exceeded: window.count > rule.maxRequests,
    resetAt: window.startMs + rule.windowMs,
  };
}

export function applyQuotaRules(
  entries: TrafficEntry[],
  rules: QuotaRule[]
): Map<string, QuotaStatus> {
  const store = createQuotaStore();
  const result = new Map<string, QuotaStatus>();

  for (const entry of entries) {
    for (const rule of rules) {
      if (entry.path === rule.route) {
        const status = checkQuota(store, rule, entry, entry.timestamp);
        result.set(quotaKey(rule.route, entry.method), status);
      }
    }
  }

  return result;
}

export function getExceededQuotas(statuses: Map<string, QuotaStatus>): QuotaStatus[] {
  return Array.from(statuses.values()).filter(s => s.exceeded);
}
