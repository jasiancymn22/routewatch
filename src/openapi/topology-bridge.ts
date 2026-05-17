import { OpenAPIObject, PathItemObject } from "openapi3-ts";
import { TrafficEntry } from "../traffic/types";
import { buildTopology, RouteTopology } from "../traffic/topology";

export function buildTopologyExtension(
  entries: TrafficEntry[],
  windowMs = 5000
): RouteTopology {
  return buildTopology(entries, windowMs);
}

export function applyTopologyToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  windowMs = 5000
): OpenAPIObject {
  const topology = buildTopologyExtension(entries, windowMs);

  const topLevelExtension = {
    "x-routewatch-topology": {
      nodes: topology.nodes.map((n) => ({
        operationId: `${n.method}:${n.path}`,
        method: n.method,
        path: n.path,
        callCount: n.callCount,
        avgLatencyMs: Math.round(n.avgLatency),
      })),
      edges: topology.edges.map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.weight,
      })),
    },
  };

  const updatedPaths: Record<string, PathItemObject> = {};

  for (const [routePath, pathItem] of Object.entries(doc.paths ?? {})) {
    const matchingNode = topology.nodes.find((n) => n.path === routePath);
    if (!matchingNode) {
      updatedPaths[routePath] = pathItem as PathItemObject;
      continue;
    }

    const connectedTo = topology.edges
      .filter((e) => e.from === `${matchingNode.method}:${matchingNode.path}`)
      .map((e) => ({ target: e.to, weight: e.weight }));

    const methodKey = matchingNode.method.toLowerCase() as keyof PathItemObject;
    const operation = (pathItem as Record<string, unknown>)[methodKey];

    updatedPaths[routePath] = {
      ...(pathItem as PathItemObject),
      [methodKey]: operation
        ? {
            ...(operation as object),
            "x-routewatch-topology": { connectedTo },
          }
        : operation,
    };
  }

  return {
    ...doc,
    ...topLevelExtension,
    paths: updatedPaths,
  };
}
