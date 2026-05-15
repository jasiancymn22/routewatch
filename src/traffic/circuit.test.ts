import {
  createCircuitStore,
  recordCircuitEvent,
  getCircuitState,
  getOpenCircuits,
  resetCircuit,
  circuitKey,
} from "./circuit";

describe("circuitKey", () => {
  it("normalises method to uppercase", () => {
    expect(circuitKey("get", "/users")).toBe("GET:/users");
  });
});

describe("createCircuitStore", () => {
  it("uses defaults", () => {
    const store = createCircuitStore();
    expect(store.errorThreshold).toBe(0.5);
    expect(store.minRequests).toBe(5);
    expect(store.resetWindowMs).toBe(60_000);
  });
});

describe("recordCircuitEvent", () => {
  it("tracks counts correctly", () => {
    const store = createCircuitStore();
    recordCircuitEvent(store, "GET", "/a", false);
    recordCircuitEvent(store, "GET", "/a", true);
    const state = getCircuitState(store, "GET", "/a")!;
    expect(state.totalRequests).toBe(2);
    expect(state.errorCount).toBe(1);
    expect(state.errorRate).toBeCloseTo(0.5);
  });

  it("does not open circuit before minRequests", () => {
    const store = createCircuitStore(0.5, 5);
    for (let i = 0; i < 4; i++) recordCircuitEvent(store, "POST", "/b", true);
    expect(getCircuitState(store, "POST", "/b")!.isOpen).toBe(false);
  });

  it("opens circuit when threshold exceeded after minRequests", () => {
    const store = createCircuitStore(0.5, 4);
    for (let i = 0; i < 3; i++) recordCircuitEvent(store, "GET", "/c", true);
    recordCircuitEvent(store, "GET", "/c", false);
    const state = getCircuitState(store, "GET", "/c")!;
    expect(state.isOpen).toBe(true);
    expect(state.openedAt).toBeDefined();
  });

  it("resets open circuit after resetWindowMs", () => {
    const store = createCircuitStore(0.5, 2, 1000);
    const past = Date.now() - 2000;
    recordCircuitEvent(store, "GET", "/d", true, past);
    recordCircuitEvent(store, "GET", "/d", true, past);
    // Force open state by manipulating the store directly
    const key = "GET:/d";
    const s = store.states.get(key)!;
    store.states.set(key, { ...s, isOpen: true, openedAt: past });
    // Next event should reset it
    const result = recordCircuitEvent(store, "GET", "/d", false, Date.now());
    expect(result.isOpen).toBe(false);
  });
});

describe("getOpenCircuits", () => {
  it("returns only open circuits", () => {
    const store = createCircuitStore(0.5, 2);
    recordCircuitEvent(store, "GET", "/ok", false);
    recordCircuitEvent(store, "GET", "/ok", false);
    recordCircuitEvent(store, "DELETE", "/bad", true);
    recordCircuitEvent(store, "DELETE", "/bad", true);
    const open = getOpenCircuits(store);
    expect(open).toHaveLength(1);
    expect(open[0].route).toBe("/bad");
  });
});

describe("resetCircuit", () => {
  it("removes the circuit state", () => {
    const store = createCircuitStore(0.5, 2);
    recordCircuitEvent(store, "GET", "/x", true);
    recordCircuitEvent(store, "GET", "/x", true);
    resetCircuit(store, "GET", "/x");
    expect(getCircuitState(store, "GET", "/x")).toBeUndefined();
  });
});
