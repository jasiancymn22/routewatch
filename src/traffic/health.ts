import { TrafficEntry } from './types';

export interface RouteHealth {
  route: string;
  method: string;
  errorRate: number;
  successRate: number;
  totalRequests: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface HealthSummary {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  routes: RouteHealth[];
  unhealthyCount: number;
  degradedCount: number;
}

const DEGRADED_THRESHOLD = 0.1;
const UNHEALTHY_THRESHOLD = 0.3;

export function computeRouteHealth(entries: TrafficEntry[]): RouteHealth[] {
  const groups = new Map<string, TrafficEntry[]>();

  for (const entry of entries) {
    const key = `${entry.method}:${entry.path}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const results: RouteHealth[] = [];

  for (const [key, group] of groups) {
    const [method, route] = key.split(':');
    const total = group.length;
    const errors = group.filter(e => e.statusCode >= 500).length;
    const errorRate = total > 0 ? errors / total : 0;
    const successRate = 1 - errorRate;

    let status: RouteHealth['status'] = 'healthy';
    if (errorRate >= UNHEALTHY_THRESHOLD) status = 'unhealthy';
    else if (errorRate >= DEGRADED_THRESHOLD) status = 'degraded';

    results.push({ route, method, errorRate, successRate, totalRequests: total, status });
  }

  return results;
}

export function computeHealthSummary(entries: TrafficEntry[]): HealthSummary {
  const routes = computeRouteHealth(entries);
  const unhealthyCount = routes.filter(r => r.status === 'unhealthy').length;
  const degradedCount = routes.filter(r => r.status === 'degraded').length;

  let overall: HealthSummary['overall'] = 'healthy';
  if (unhealthyCount > 0) overall = 'unhealthy';
  else if (degradedCount > 0) overall = 'degraded';

  return { overall, routes, unhealthyCount, degradedCount };
}
