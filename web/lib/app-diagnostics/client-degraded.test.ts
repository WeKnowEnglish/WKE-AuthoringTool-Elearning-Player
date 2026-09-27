import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

describe("degraded diagnostics dependencies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not interrupt the learning action when browser storage is unavailable", () => {
    const unavailableStorage = {
      getItem() {
        throw new Error("storage unavailable");
      },
      setItem() {
        throw new Error("storage unavailable");
      },
    };
    vi.stubGlobal("window", {
      location: { pathname: "/primary", search: "" },
      innerWidth: 800,
      screen: { width: 800 },
      sessionStorage: unavailableStorage,
      localStorage: unavailableStorage,
      setTimeout: vi.fn(() => 1),
      dispatchEvent: vi.fn(),
    });

    expect(() => recordAppDiagnostic(
      "student",
      "activity",
      "activity_opened",
      undefined,
      { activityId: "safe-activity-id", status: "started" },
    )).not.toThrow();
  });
});
