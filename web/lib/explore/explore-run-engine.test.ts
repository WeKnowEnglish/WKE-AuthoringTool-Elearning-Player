import { describe, expect, it } from "vitest";
import { exploreDodgeJumpOffset } from "@/lib/explore/explore-runner-draw";
import {
  allGatesCleared,
  buildExploreRunConfig,
  createExploreRunState,
  EXPLORE_PLAYER_START_X,
  playerHitsHazard,
  resolveChainedGateApproachXs,
  resolveGateWorldPositions,
  shouldTriggerGate,
  tickExploreRun,
  beginGateResolve,
  type ExploreRunState,
} from "@/lib/explore/explore-run-engine";
import type { ExplorePayload } from "@/lib/lesson-schemas";

const samplePayload: ExplorePayload = {
  type: "interaction",
  subtype: "explore",
  world_length: 3200,
  scroll_speed_px_per_sec: 140,
  gates: [
    {
      id: "g1",
      prompt: "Spell",
      target_word: "run",
      world_x: 800,
    },
    {
      id: "g2",
      prompt: "Spell",
      target_word: "jump",
    },
    {
      id: "g3",
      prompt: "Spell",
      target_word: "fast",
      world_x: 2800,
    },
  ],
  encounter: {
    title: "Place",
    choices: [
      { id: "a", label: "A", gold_bonus: 5 },
      { id: "b", label: "B", gold_bonus: 10 },
    ],
  },
};

describe("resolveChainedGateApproachXs", () => {
  it("uses short run-in before first gate and brief gaps between gates", () => {
    const xs = resolveChainedGateApproachXs(3, 140);
    expect(xs[0]).toBe(EXPLORE_PLAYER_START_X + Math.round(140 * 1.25));
    expect(xs[1]! - xs[0]!).toBe(Math.round(140 * 1.5));
    expect(xs[2]! - xs[1]!).toBe(Math.round(140 * 1.5));
    expect(xs[0]!).toBeLessThan(400);
  });
});

describe("resolveGateWorldPositions", () => {
  it("keeps explicit world_x and places auto gates near chain", () => {
    const xs = resolveGateWorldPositions(samplePayload.gates, 3200, 140);
    expect(xs).toHaveLength(3);
    expect(xs[0]).toBe(800);
    expect(xs[2]).toBe(2800);
    expect(xs[1]!).toBeLessThan(1200);
  });
});

describe("buildExploreRunConfig", () => {
  it("builds hazards aligned to gate world_x", () => {
    const config = buildExploreRunConfig(samplePayload);
    expect(config.gates).toHaveLength(3);
    expect(config.hazards).toHaveLength(3);
    expect(config.gates[0]!.approach_world_x).toBeLessThan(400);
    expect(config.gates[1]!.approach_world_x).toBeGreaterThan(config.gates[0]!.approach_world_x);
  });
});

describe("shouldTriggerGate", () => {
  it("triggers only for the current gate index", () => {
    const config = buildExploreRunConfig(samplePayload);
    const gate = config.gates[0]!;
    expect(shouldTriggerGate(gate.approach_world_x + 10, gate, 0, 0)).toBe(true);
    expect(shouldTriggerGate(gate.approach_world_x - 10, gate, 1, 0)).toBe(false);
  });
});

describe("tickExploreRun", () => {
  it("advances player while running", () => {
    const config = buildExploreRunConfig(samplePayload);
    const state = createExploreRunState();
    const { state: next } = tickExploreRun({
      dtSec: 1,
      nowMs: 0,
      config,
      state,
    });
    expect(next.playerX).toBeGreaterThan(state.playerX);
    expect(next.mode).toBe("running");
  });

  it("does not advance player toward hazard during gateQuiz (loop 1 quiz only)", () => {
    const config = buildExploreRunConfig(samplePayload);
    const state: ExploreRunState = {
      ...createExploreRunState(),
      mode: "gateQuiz",
      activeGateIndex: 0,
      playerX: 700,
    };
    const { state: next } = tickExploreRun({
      dtSec: 0.5,
      nowMs: 0,
      config,
      state,
    });
    expect(next.playerX).toBe(700);
    expect(next.mode).toBe("gateQuiz");
  });

  it("anchors resolveStartedAtMs on first gateResolve tick when missing", () => {
    const config = buildExploreRunConfig(samplePayload);
    const state: ExploreRunState = {
      ...createExploreRunState(),
      mode: "gateResolve",
      gateOutcome: "hit",
      resolveStartedAtMs: null,
      activeGateIndex: 0,
    };
    const { state: ticked } = tickExploreRun({
      dtSec: 0,
      nowMs: 2000,
      config,
      state,
    });
    expect(ticked.resolveStartedAtMs).toBe(2000);
    expect(ticked.mode).toBe("gateResolve");
  });

  it("transitions gateResolve hit to running after resolve duration", () => {
    const config = buildExploreRunConfig(samplePayload);
    let state = beginGateResolve(
      { ...createExploreRunState(), activeGateIndex: 0, mode: "gateQuiz" },
      "hit",
      1000,
    );
    const { state: done } = tickExploreRun({
      dtSec: 0,
      nowMs: 1000 + 1650,
      config,
      state,
    });
    expect(done.mode).toBe("running");
    expect(done.gatesCleared).toBe(1);
    expect(config.hazards[0]!.cleared).toBe(false);
    expect(done.scrollSpeedMul).toBe(0.55);
  });

  it("transitions gateResolve to running after resolve duration", () => {
    const config = buildExploreRunConfig(samplePayload);
    let state = beginGateResolve(
      { ...createExploreRunState(), activeGateIndex: 0, mode: "gateQuiz" },
      "dodge",
      1000,
    );
    const { state: mid } = tickExploreRun({
      dtSec: 0,
      nowMs: 1500,
      config,
      state,
    });
    expect(mid.mode).toBe("gateResolve");
    const { state: done } = tickExploreRun({
      dtSec: 0,
      nowMs: 1000 + 1650,
      config,
      state: mid,
    });
    expect(done.mode).toBe("running");
    expect(done.gatesCleared).toBe(1);
    expect(config.hazards[0]!.cleared).toBe(true);
  });
});

describe("allGatesCleared", () => {
  it("is true when gatesCleared equals gate count", () => {
    expect(allGatesCleared(3, 3)).toBe(true);
    expect(allGatesCleared(2, 3)).toBe(false);
  });
});

describe("playerHitsHazard", () => {
  it("detects collision with uncleared hazard", () => {
    const config = buildExploreRunConfig(samplePayload);
    const hazard = config.hazards[0]!;
    expect(playerHitsHazard(hazard.x - 60, hazard)).toBe(false);
    expect(playerHitsHazard(hazard.x, hazard)).toBe(true);
  });
});

describe("exploreDodgeJumpOffset", () => {
  it("arcs upward mid-jump and lands forward", () => {
    expect(exploreDodgeJumpOffset(0).dy).toBeCloseTo(0);
    expect(exploreDodgeJumpOffset(0.5).dy).toBeLessThan(-20);
    expect(exploreDodgeJumpOffset(1).dy).toBeCloseTo(0);
    expect(exploreDodgeJumpOffset(1).dx).toBeGreaterThan(30);
  });
});
