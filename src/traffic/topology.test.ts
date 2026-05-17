import { buildRouteNodes, buildRouteEdges, buildTopology } from "./topology";
import { TrafficEntry } from "./types";

function makeEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    method: "GET",
    path: "/api/test",
    statusCode: 200,
    timestamp: Date.now(),
    durationMs: 100,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

describe("buildRouteNodes", () => {
  it("returns a node per unique method+path", () => {
    const entries = [
      makeEntry({ method: "GET", path: "/a", durationMs: 100 }),
      makeEntry({ method: "GET", path: "/a", durationMs: 200 }),
      makeEntry({ method: "POST", path: "/b", durationMs: 50 }),
    ];
    const nodes = buildRouteNodes(entries);
    expect(nodes).toHaveLength(2);
    const a = nodes.find((n) => n.path === "/a");
    expect(a?.callCount).toBe(2);
    expect(a?.avgLatency).toBe(150);
  });

  it("returns empty array for no entries", () => {
    expect(buildRouteNodes([])).toEqual([]);
  });
});

describe("buildRouteEdges", () => {
  it("creates edges for sequential requests within window", () => {
    const now = 1000;
    const entries = [
      makeEntry({ method: "GET", path: "/a", timestamp: now }),
      makeEntry({ method: "GET", path: "/b", timestamp: now + 1000 }),
    ];
    const edges = buildRouteEdges(entries, 5000);
    expect(edges).toHaveLength(1);
    expect(edges[0].from).toBe("GET:/a");
    expect(edges[0].to).toBe("GET:/b");
    expect(edges[0].weight).toBe(1);
  });

  it("ignores edges outside the window", () => {
    const now = 1000;
    const entries = [
      makeEntry({ method: "GET", path: "/a", timestamp: now }),
      makeEntry({ method: "GET", path: "/b", timestamp: now + 10000 }),
    ];
    const edges = buildRouteEdges(entries, 5000);
    expect(edges).toHaveLength(0);
  });

  it("does not create self-edges", () => {
    const now = 1000;
    const entries = [
      makeEntry({ method: "GET", path: "/a", timestamp: now }),
      makeEntry({ method: "GET", path: "/a", timestamp: now + 100 }),
    ];
    const edges = buildRouteEdges(entries, 5000);
    expect(edges).toHaveLength(0);
  });

  it("accumulates weight for repeated transitions", () => {
    const now = 1000;
    const entries = [
      makeEntry({ method: "GET", path: "/a", timestamp: now }),
      makeEntry({ method: "GET", path: "/b", timestamp: now + 100 }),
      makeEntry({ method: "GET", path: "/a", timestamp: now + 200 }),
      makeEntry({ method: "GET", path: "/b", timestamp: now + 300 }),
    ];
    const edges = buildRouteEdges(entries, 5000);
    const ab = edges.find((e) => e.from === "GET:/a" && e.to === "GET:/b");
    expect(ab?.weight).toBe(2);
  });
});

describe("buildTopology", () => {
  it("returns nodes and edges", () => {
    const now = 1000;
    const entries = [
      makeEntry({ method: "GET", path: "/x", timestamp: now }),
      makeEntry({ method: "POST", path: "/y", timestamp: now + 500 }),
    ];
    const topo = buildTopology(entries, 5000);
    expect(topo.nodes).toHaveLength(2);
    expect(topo.edges).toHaveLength(1);
  });
});
