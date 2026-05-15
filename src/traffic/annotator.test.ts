import {
  buildAnnotationKey,
  createAnnotationMap,
  annotateEntry,
  getAnnotation,
  applyAnnotationsToEntries,
  mergeAnnotationMaps,
} from "./annotator";
import { TrafficEntry } from "./types";

function makeEntry(method: string, path: string): TrafficEntry {
  return {
    method,
    path,
    statusCode: 200,
    requestHeaders: {},
    responseHeaders: {},
    timestamp: Date.now(),
  } as TrafficEntry;
}

describe("buildAnnotationKey", () => {
  it("normalizes method to uppercase", () => {
    expect(buildAnnotationKey("get", "/users")).toBe("GET:/users");
  });

  it("preserves path", () => {
    expect(buildAnnotationKey("POST", "/api/v1/items")).toBe("POST:/api/v1/items");
  });
});

describe("annotateEntry", () => {
  it("adds annotation to map", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { tags: ["users"], summary: "List users" });
    const result = getAnnotation(map, "GET", "/users");
    expect(result?.tags).toContain("users");
    expect(result?.summary).toBe("List users");
  });

  it("merges tags on repeated annotation", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { tags: ["users"] });
    annotateEntry(map, "GET", "/users", { tags: ["public"] });
    const result = getAnnotation(map, "GET", "/users");
    expect(result?.tags).toEqual(["users", "public"]);
  });

  it("deduplicates tags", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { tags: ["users"] });
    annotateEntry(map, "GET", "/users", { tags: ["users"] });
    const result = getAnnotation(map, "GET", "/users");
    expect(result?.tags).toEqual(["users"]);
  });
});

describe("applyAnnotationsToEntries", () => {
  it("attaches annotation to matching entries", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { tags: ["users"], deprecated: false });
    const entries = [makeEntry("GET", "/users"), makeEntry("POST", "/items")];
    const result = applyAnnotationsToEntries(entries, map);
    expect((result[0] as any).annotation?.tags).toContain("users");
    expect((result[1] as any).annotation).toBeUndefined();
  });
});

describe("mergeAnnotationMaps", () => {
  it("combines two maps, override wins for scalar fields", () => {
    const base = createAnnotationMap();
    annotateEntry(base, "GET", "/users", { summary: "old", tags: ["a"] });

    const override = createAnnotationMap();
    annotateEntry(override, "GET", "/users", { summary: "new", tags: ["b"] });

    const merged = mergeAnnotationMaps(base, override);
    const result = getAnnotation(merged, "GET", "/users");
    expect(result?.summary).toBe("new");
    expect(result?.tags).toEqual(["a", "b"]);
  });
});
