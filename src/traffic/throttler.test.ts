import {
  createThrottleStore,
  shouldThrottle,
  throttleKey,
  resetThrottleStore,
  getThrottleCounts,
} from "./throttler";

describe("throttleKey", () => {
  it("combines method and path", () => {
    expect(throttleKey("get", "/users")).toBe("GET:/users");
    expect(throttleKey("POST", "/items")).toBe("POST:/items");
  });
});

describe("shouldThrottle", () => {
  it("allows first request through", () => {
    const store = createThrottleStore();
    expect(shouldThrottle(store, "GET", "/users", 1000)).toBe(false);
  });

  it("allows requests up to maxPerWindow", () => {
    const store = createThrottleStore();
    const opts = { windowMs: 60_000, maxPerWindow: 3 };
    expect(shouldThrottle(store, "GET", "/a", 1000, opts)).toBe(false);
    expect(shouldThrottle(store, "GET", "/a", 1001, opts)).toBe(false);
    expect(shouldThrottle(store, "GET", "/a", 1002, opts)).toBe(false);
    expect(shouldThrottle(store, "GET", "/a", 1003, opts)).toBe(true);
  });

  it("resets after window expires", () => {
    const store = createThrottleStore();
    const opts = { windowMs: 1000, maxPerWindow: 1 };
    expect(shouldThrottle(store, "GET", "/b", 0, opts)).toBe(false);
    expect(shouldThrottle(store, "GET", "/b", 500, opts)).toBe(true);
    // New window
    expect(shouldThrottle(store, "GET", "/b", 1001, opts)).toBe(false);
  });

  it("tracks different routes independently", () => {
    const store = createThrottleStore();
    const opts = { windowMs: 60_000, maxPerWindow: 1 };
    expect(shouldThrottle(store, "GET", "/x", 1000, opts)).toBe(false);
    expect(shouldThrottle(store, "GET", "/y", 1000, opts)).toBe(false);
    expect(shouldThrottle(store, "GET", "/x", 1001, opts)).toBe(true);
    expect(shouldThrottle(store, "GET", "/y", 1001, opts)).toBe(true);
  });

  it("tracks different methods independently", () => {
    const store = createThrottleStore();
    const opts = { windowMs: 60_000, maxPerWindow: 1 };
    expect(shouldThrottle(store, "GET", "/z", 1000, opts)).toBe(false);
    expect(shouldThrottle(store, "POST", "/z", 1000, opts)).toBe(false);
    expect(shouldThrottle(store, "GET", "/z", 1001, opts)).toBe(true);
    expect(shouldThrottle(store, "POST", "/z", 1001, opts)).toBe(false); // still 1
  });
});

describe("resetThrottleStore", () => {
  it("clears all buckets", () => {
    const store = createThrottleStore();
    const opts = { windowMs: 60_000, maxPerWindow: 1 };
    shouldThrottle(store, "GET", "/a", 1000, opts);
    shouldThrottle(store, "POST", "/b", 1000, opts);
    resetThrottleStore(store);
    expect(store.size).toBe(0);
  });
});

describe("getThrottleCounts", () => {
  it("returns current counts per key", () => {
    const store = createThrottleStore();
    const opts = { windowMs: 60_000, maxPerWindow: 10 };
    shouldThrottle(store, "GET", "/a", 1000, opts);
    shouldThrottle(store, "GET", "/a", 1001, opts);
    shouldThrottle(store, "POST", "/b", 1000, opts);
    const counts = getThrottleCounts(store);
    expect(counts["GET:/a"]).toBe(2);
    expect(counts["POST:/b"]).toBe(1);
  });
});
