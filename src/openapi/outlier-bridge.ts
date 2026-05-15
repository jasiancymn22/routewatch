import { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import {
  detectOutliersByRoute,
  summarizeOutliers,
  OutlierResult,
} from '../traffic/outlier';

export interface OutlierExtension {
  'x-outlier-count': number;
  'x-outlier-max-zscore': number;
  'x-outlier-avg-zscore': number;
}

export function buildOutlierExtension(outliers: OutlierResult[]): OutlierExtension {
  const summary = summarizeOutliers(outliers);
  return {
    'x-outlier-count': summary.count,
    'x-outlier-max-zscore': parseFloat(summary.maxZScore.toFixed(2)),
    'x-outlier-avg-zscore': parseFloat(summary.avgZScore.toFixed(2)),
  };
}

export function applyOutliersToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  threshold = 2.5
): OpenAPIObject {
  const outlierMap = detectOutliersByRoute(entries, threshold);

  if (!doc.paths) return doc;

  const updatedPaths: Record<string, PathItemObject> = {};

  for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
    const updatedItem: PathItemObject = { ...pathItem };
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method] as
        | OperationObject
        | undefined;
      if (!operation) continue;

      const routeKey = `${method.toUpperCase()}:${pathKey}`;
      const outliers = outlierMap.get(routeKey);

      if (outliers && outliers.length > 0) {
        const extension = buildOutlierExtension(outliers);
        (updatedItem as Record<string, unknown>)[method] = {
          ...operation,
          ...extension,
        };
      }
    }

    updatedPaths[pathKey] = updatedItem;
  }

  return { ...doc, paths: updatedPaths };
}
