import { OpenAPIObject } from 'openapi3-ts';
import { TrafficSnapshot } from '../traffic/snapshot';

export interface SnapshotExtension {
  capturedAt: string;
  entryCount: number;
  routeCount: number;
  routes: string[];
}

export function buildSnapshotExtension(
  snapshot: TrafficSnapshot
): SnapshotExtension {
  return {
    capturedAt: new Date(snapshot.meta.capturedAt).toISOString(),
    entryCount: snapshot.meta.entryCount,
    routeCount: snapshot.meta.routes.length,
    routes: snapshot.meta.routes,
  };
}

export function applySnapshotToDocument(
  doc: OpenAPIObject,
  snapshot: TrafficSnapshot
): OpenAPIObject {
  const extension = buildSnapshotExtension(snapshot);
  return {
    ...doc,
    info: {
      ...doc.info,
      'x-snapshot': extension,
    },
  };
}
