import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { didServiceRestart } from "@/lib/service-session";

const STORAGE_KEY = "loadmind.serviceInstances.v1";

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe("service restart detection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the first observed service instances without forcing sign-out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse({ instance_id: "backend-a" }))
        .mockResolvedValueOnce(jsonResponse({ instanceId: "frontend-a" })),
    );

    await expect(didServiceRestart()).resolves.toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({ backend: "backend-a", frontend: "frontend-a" }),
    );
  });

  it("detects a backend instance change after the first observation", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ backend: "backend-a", frontend: "frontend-a" }));
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse({ instance_id: "backend-b" }))
        .mockResolvedValueOnce(jsonResponse({ instanceId: "frontend-a" })),
    );

    await expect(didServiceRestart()).resolves.toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({ backend: "backend-b", frontend: "frontend-a" }),
    );
  });
});
