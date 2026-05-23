import { describe, expect, it } from "vitest";
import {
  beginGateResolve,
  createExploreRunState,
} from "@/lib/explore/explore-run-engine";
import { mergeExploreRunState, resolveExploreMode } from "@/lib/explore/explore-run-modes";

describe("resolveExploreMode", () => {
  it("does not downgrade gateResolve to gateQuiz (stale RAF)", () => {
    expect(resolveExploreMode("gateResolve", "gateQuiz")).toBe("gateResolve");
  });

  it("allows engine to leave gateResolve for running or encounter", () => {
    expect(resolveExploreMode("gateResolve", "running")).toBe("running");
    expect(resolveExploreMode("gateResolve", "encounter")).toBe("encounter");
  });

  it("advances from running to gateQuiz", () => {
    expect(resolveExploreMode("running", "gateQuiz")).toBe("gateQuiz");
  });
});

describe("mergeExploreRunState", () => {
  it("ignores stale gateQuiz ticks during gateResolve", () => {
    const resolving = beginGateResolve(
      { ...createExploreRunState(), mode: "gateQuiz", activeGateIndex: 0 },
      "hit",
      5000,
    );
    const staleQuiz = {
      ...createExploreRunState(),
      mode: "gateQuiz" as const,
      activeGateIndex: 0,
      playerX: resolving.playerX,
    };
    const merged = mergeExploreRunState(resolving, staleQuiz);
    expect(merged).toBe(resolving);
    expect(merged.gateOutcome).toBe("hit");
    expect(merged.resolveStartedAtMs).toBe(5000);
  });

  it("accepts engine transition when resolve completes", () => {
    const resolving = beginGateResolve(
      { ...createExploreRunState(), mode: "gateQuiz", activeGateIndex: 0 },
      "hit",
      5000,
    );
    const afterResolve = {
      ...resolving,
      mode: "running" as const,
      gatesCleared: 1,
      gateOutcome: null,
      resolveStartedAtMs: null,
      activeGateIndex: 1,
    };
    const merged = mergeExploreRunState(resolving, afterResolve);
    expect(merged.mode).toBe("running");
    expect(merged.gatesCleared).toBe(1);
  });
});
