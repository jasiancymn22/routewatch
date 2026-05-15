import { OpenAPIV3 } from "openapi-types";
import { applyAnnotationsToDocument } from "./annotator-bridge";
import { createAnnotationMap, annotateEntry } from "../traffic/annotator";

function makeDoc(extra?: Partial<OpenAPIV3.OperationObject>): OpenAPIV3.Document {
  return {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "listUsers",
          responses: { "200": { description: "ok" } },
          ...extra,
        },
      },
    },
  };
}

describe("applyAnnotationsToDocument", () => {
  it("adds tags from annotation map", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { tags: ["users"] });
    const result = applyAnnotationsToDocument(makeDoc(), map);
    const op = result.paths["/users"]?.get as OpenAPIV3.OperationObject;
    expect(op.tags).toContain("users");
  });

  it("sets summary and description", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { summary: "List all users", description: "Returns a list" });
    const result = applyAnnotationsToDocument(makeDoc(), map);
    const op = result.paths["/users"]?.get as OpenAPIV3.OperationObject;
    expect(op.summary).toBe("List all users");
    expect(op.description).toBe("Returns a list");
  });

  it("marks operation as deprecated", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { deprecated: true });
    const result = applyAnnotationsToDocument(makeDoc(), map);
    const op = result.paths["/users"]?.get as OpenAPIV3.OperationObject;
    expect(op.deprecated).toBe(true);
  });

  it("does not modify operations without matching annotation", () => {
    const map = createAnnotationMap();
    const doc = makeDoc({ tags: ["existing"] });
    const result = applyAnnotationsToDocument(doc, map);
    const op = result.paths["/users"]?.get as OpenAPIV3.OperationObject;
    expect(op.tags).toEqual(["existing"]);
  });

  it("deduplicates tags when merging", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { tags: ["users"] });
    const doc = makeDoc({ tags: ["users", "v1"] });
    const result = applyAnnotationsToDocument(doc, map);
    const op = result.paths["/users"]?.get as OpenAPIV3.OperationObject;
    expect(op.tags?.filter((t) => t === "users").length).toBe(1);
  });

  it("returns document unchanged when paths is empty", () => {
    const map = createAnnotationMap();
    annotateEntry(map, "GET", "/users", { tags: ["users"] });
    const doc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "T", version: "1" },
      paths: {},
    };
    const result = applyAnnotationsToDocument(doc, map);
    expect(result.paths).toEqual({});
  });
});
