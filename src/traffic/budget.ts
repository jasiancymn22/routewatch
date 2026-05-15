import { TrafficEntry } from './types';

export interface BudgetRule {
  route: string;
  method?: string;
  maxErrorRate?: number;   // 0–1
  maxP99LatencyMs?: number;
  maxRequestsPerMinute?: number;
}

export interface BudgetViolation {
  route: string;
  method: string;
  rule: keyof Omit<BudgetRule, 'route' | 'method'>;
  actual: number;
  limit: number;
}

export function checkBudget(
  entries: TrafficEntry[],
  rules: BudgetRule[]
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];

  for (const rule of rules) {
    const matched = entries.filter(
      (e) =>
        e.path === rule.route &&
        (!rule.method || e.method.toUpperCase() === rule.method.toUpperCase())
    );
    if (matched.length === 0) continue;

    const method = rule.method ?? '*';

    if (rule.maxErrorRate !== undefined) {
      const errors = matched.filter((e) => e.statusCode >= 400).length;
      const rate = errors / matched.length;
      if (rate > rule.maxErrorRate) {
        violations.push({ route: rule.route, method, rule: 'maxErrorRate', actual: rate, limit: rule.maxErrorRate });
      }
    }

    if (rule.maxP99LatencyMs !== undefined) {
      const latencies = matched
        .map((e) => e.durationMs ?? 0)
        .sort((a, b) => a - b);
      const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
      if (p99 > rule.maxP99LatencyMs) {
        violations.push({ route: rule.route, method, rule: 'maxP99LatencyMs', actual: p99, limit: rule.maxP99LatencyMs });
      }
    }

    if (rule.maxRequestsPerMinute !== undefined) {
      const oldest = Math.min(...matched.map((e) => e.timestamp));
      const newest = Math.max(...matched.map((e) => e.timestamp));
      const minutes = Math.max((newest - oldest) / 60000, 1);
      const rpm = matched.length / minutes;
      if (rpm > rule.maxRequestsPerMinute) {
        violations.push({ route: rule.route, method, rule: 'maxRequestsPerMinute', actual: rpm, limit: rule.maxRequestsPerMinute });
      }
    }
  }

  return violations;
}

export function groupViolationsByRoute(
  violations: BudgetViolation[]
): Record<string, BudgetViolation[]> {
  return violations.reduce<Record<string, BudgetViolation[]>>((acc, v) => {
    (acc[v.route] ??= []).push(v);
    return acc;
  }, {});
}
