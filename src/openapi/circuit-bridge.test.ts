import { applyCircuitsToDocument, buildCircuitExtension } from "./circuit-bridge";
import { createCircuitStore, recordCircuitEvent } from "../traffic/circuit";
import type { OpenAPIObject } from "openapi3-ts/oas30";

function makeDoc(overrides: Partial<OpenAPIObject> = {}): OpenAPIObject {
  return {
    openapi: "3.0.0",
    info: { title: "Test", version: "0.0.1" },
    paths: {
      "/users": {
        get: { responses: { "200": { description: "ok" } } },
        delete: { responses: { "204": { description: "deleted" } } },
      },
    },
    ...overrides,
  };
}

describe("buildCircuitExtension", () => {
  it("includes isOpen, errorRate, totalRequests", () => {
    const ext = buildCircuitExtension({
      route: "/users",
      method: "GET",
      totalRequests: 10,
      errorCount: 6,
      errorRate: 0.6,
      isOpen: true,
      openedAt: 12345,
    });
    expect(ext["x-circuit-breaker"].isOpen).toBe(true);
    expect(ext["x-circuit-breaker"].errorRate).toBe(0.6);
    expect(ext["x-circuit-breaker"].totalRequests).toBe(10);
    expect(ext["x-circuit-breaker"].openedAt).toBe(12345);
  });

  it("omits openedAt when undefined", () => {
    const ext = buildCircuitExtension({
      route: "/a",
      method: "GET",
      totalRequests: 1,
      errorCount: 0,
      errorRate: 0,
      isOpen: false,
    });
    expect("openedAt" in ext["x-circuit-breaker"]).toBe(false);
  });
});

describe("applyCircuitsToDocument", () => {
  it("returns doc unchanged when no open circuits", () => {
    const store = createCircuitStore();
    const doc = makeDoc();
    const result = applyCircuitsToDocument(doc, store);
    expect(result).toEqual(doc);
  });

  it("annotates open circuit operations", () => {
    const store = createCircuitStore(0.5, 2);
    recordCircuitEvent(store, "GET", "/users", true);
    recordCircuitEvent(store, "GET", "/users", true);

    const doc = makeDoc();
    const result = applyCircuitsToDocument(doc, store);
    const op = (result.paths!["/users"] as Record<string, unknown>)["get"] as Record<string, unknown>;
    expect(op["x-circuit-breaker"]).toBeDefined();
    expect((op["x-circuit-breaker"] as Record<string, unknown>).isOpen).toBe(true);
  });

  it("does not annotate closed circuit operations", () => {
    const store = createCircuitStore(0.5, 2);
    recordCircuitEvent(store, "DELETE", "/users", false);
    recordCircuitEvent(store, "DELETE", "/users", false);

    const doc = makeDoc();
    const result = applyCircuitsToDocument(doc, store);
    const op = (result.paths!["/users"] as Record<string, unknown>)["delete"] as Record<string, unknown>;
    expect(op["x-circuit-breaker"]).toBeUndefined();
  });

  it("skips routes not present in the document", () => {
    const store = createCircuitStore(0.5, 2);
    recordCircuitEvent(store, "GET", "/missing", true);
    recordCircuitEvent(store, "GET", "/missing", true);

    const doc = makeDoc();
    expect(() => applyCircuitsToDocument(doc, store)).not.toThrow();
  });
});
