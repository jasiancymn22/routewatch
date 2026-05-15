import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts/oas30';
import { TrafficEntry } from '../traffic/types';
import { buildHeatmap, getPeakCell, flattenHeatmaps, RouteHeatmap } from '../traffic/heatmap';

export interface HeatmapExtension {
  'x-heatmap': {
    peakHour: number;
    peakDay: number;
    peakCount: number;
    cells: Array<{ hour: number; day: number; count: number; avgLatency: number }>;
  };
}

export function buildHeatmapExtension(heatmap: RouteHeatmap): HeatmapExtension | null {
  const peak = getPeakCell(heatmap);
  if (!peak) return null;
  return {
    'x-heatmap': {
      peakHour: peak.hour,
      peakDay: peak.day,
      peakCount: peak.count,
      cells: heatmap.cells.map(c => ({
        hour: c.hour,
        day: c.day,
        count: c.count,
        avgLatency: Math.round(c.avgLatency),
      })),
    },
  };
}

export function applyHeatmapToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[]
): OpenAPIObject {
  const heatmaps = buildHeatmap(entries);
  const heatmapIndex = new Map<string, RouteHeatmap>();
  for (const hm of heatmaps) {
    heatmapIndex.set(`${hm.method.toUpperCase()}:${hm.route}`, hm);
  }

  const paths = doc.paths ?? {};
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
    for (const method of methods) {
      const operation = (pathItem as PathItemObject)[method] as OperationObject | undefined;
      if (!operation) continue;
      const hm = heatmapIndex.get(`${method.toUpperCase()}:${pathKey}`);
      if (!hm) continue;
      const ext = buildHeatmapExtension(hm);
      if (ext) {
        Object.assign(operation, ext);
      }
    }
  }

  const allFlattened = flattenHeatmaps(heatmaps);
  if (allFlattened.length > 0) {
    const globalPeak = allFlattened.reduce((max, c) => (c.count > max.count ? c : max));
    (doc as any)['x-global-heatmap'] = {
      peakHour: globalPeak.hour,
      peakDay: globalPeak.day,
      totalCells: allFlattened.length,
    };
  }

  return doc;
}
