import { TrafficEntry } from './types';
import { computeRouteStats } from './stats';

export interface AnomalyResult {
  route: string;
  method: string;
  type: 'latency_spike' | 'error_surge' | 'traffic_drop' | 'traffic_spike';
  severity: 'low' | 'medium' | 'high';
  value: number;
  threshold: number;
  detectedAt: number;
}

export interface AnomalyOptions {
  latencyMultiplier?: number;
  errorRateThreshold?: number;
  trafficDropFactor?: number;
  traffiSpikeFactor?: number;
}

const DEFAULTS: Required<AnomalyOptions> = {
  latencyMultiplier: 2.5,
  errorRateThreshold: 0.2,
  trafficDropFactor: 0.3,
  traffiSpikeFactor: 3.0,
};

export function detectAnomalies(
  current: TrafficEntry[],
  baseline: TrafficEntry[],
  options: AnomalyOptions = {}
): AnomalyResult[] {
  const opts = { ...DEFAULTS, ...options };
  const anomalies: AnomalyResult[] = [];
  const now = Date.now();

  const currentStats = computeRouteStats(current);
  const baselineStats = computeRouteStats(baseline);

  for (const key of Object.keys(currentStats)) {
    const cur = currentStats[key];
    const base = baselineStats[key];
    const [method, route] = key.split(':');

    if (!base) continue;

    const latencyThreshold = base.avgLatency * opts.latencyMultiplier;
    if (cur.avgLatency > latencyThreshold) {
      anomalies.push({
        route,
        method,
        type: 'latency_spike',
        severity: cur.avgLatency > latencyThreshold * 2 ? 'high' : 'medium',
        value: cur.avgLatency,
        threshold: latencyThreshold,
        detectedAt: now,
      });
    }

    const errorRate = cur.errorCount / Math.max(cur.count, 1);
    if (errorRate > opts.errorRateThreshold) {
      anomalies.push({
        route,
        method,
        type: 'error_surge',
        severity: errorRate > 0.5 ? 'high' : errorRate > 0.3 ? 'medium' : 'low',
        value: errorRate,
        threshold: opts.errorRateThreshold,
        detectedAt: now,
      });
    }

    const trafficRatio = cur.count / Math.max(base.count, 1);
    if (trafficRatio < opts.trafficDropFactor) {
      anomalies.push({
        route,
        method,
        type: 'traffic_drop',
        severity: trafficRatio < 0.1 ? 'high' : 'medium',
        value: cur.count,
        threshold: base.count * opts.trafficDropFactor,
        detectedAt: now,
      });
    } else if (trafficRatio > opts.traffiSpikeFactor) {
      anomalies.push({
        route,
        method,
        type: 'traffic_spike',
        severity: trafficRatio > opts.traffiSpikeFactor * 2 ? 'high' : 'medium',
        value: cur.count,
        threshold: base.count * opts.traffiSpikeFactor,
        detectedAt: now,
      });
    }
  }

  return anomalies;
}

export function groupAnomaliesByRoute(
  anomalies: AnomalyResult[]
): Record<string, AnomalyResult[]> {
  return anomalies.reduce((acc, a) => {
    const key = `${a.method}:${a.route}`;
    (acc[key] = acc[key] || []).push(a);
    return acc;
  }, {} as Record<string, AnomalyResult[]>);
}
