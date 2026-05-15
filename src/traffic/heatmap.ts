import { TrafficEntry } from './types';

export interface HeatmapCell {
  hour: number; // 0-23
  day: number;  // 0-6 (Sunday=0)
  count: number;
  avgLatency: number;
}

export interface RouteHeatmap {
  route: string;
  method: string;
  cells: HeatmapCell[];
}

export function buildHeatmapKey(hour: number, day: number): string {
  return `${day}:${hour}`;
}

export function buildHeatmap(entries: TrafficEntry[]): RouteHeatmap[] {
  const routeMap = new Map<string, Map<string, { count: number; totalLatency: number }>>();

  for (const entry of entries) {
    const ts = new Date(entry.timestamp);
    const hour = ts.getHours();
    const day = ts.getDay();
    const routeKey = `${entry.method}:${entry.path}`;
    const cellKey = buildHeatmapKey(hour, day);

    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, new Map());
    }
    const cellMap = routeMap.get(routeKey)!;
    const existing = cellMap.get(cellKey) ?? { count: 0, totalLatency: 0 };
    cellMap.set(cellKey, {
      count: existing.count + 1,
      totalLatency: existing.totalLatency + (entry.durationMs ?? 0),
    });
  }

  const result: RouteHeatmap[] = [];
  for (const [routeKey, cellMap] of routeMap.entries()) {
    const [method, ...pathParts] = routeKey.split(':');
    const route = pathParts.join(':');
    const cells: HeatmapCell[] = [];
    for (const [cellKey, data] of cellMap.entries()) {
      const [day, hour] = cellKey.split(':').map(Number);
      cells.push({
        hour,
        day,
        count: data.count,
        avgLatency: data.count > 0 ? data.totalLatency / data.count : 0,
      });
    }
    result.push({ route, method, cells });
  }
  return result;
}

export function getPeakCell(heatmap: RouteHeatmap): HeatmapCell | null {
  if (heatmap.cells.length === 0) return null;
  return heatmap.cells.reduce((max, cell) => (cell.count > max.count ? cell : max));
}

export function flattenHeatmaps(heatmaps: RouteHeatmap[]): HeatmapCell[] {
  const merged = new Map<string, HeatmapCell>();
  for (const hm of heatmaps) {
    for (const cell of hm.cells) {
      const key = buildHeatmapKey(cell.hour, cell.day);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...cell });
      } else {
        const totalCount = existing.count + cell.count;
        merged.set(key, {
          hour: cell.hour,
          day: cell.day,
          count: totalCount,
          avgLatency:
            (existing.avgLatency * existing.count + cell.avgLatency * cell.count) / totalCount,
        });
      }
    }
  }
  return Array.from(merged.values());
}
