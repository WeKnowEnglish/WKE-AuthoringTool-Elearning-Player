import { describe, expect, it } from "vitest";
import {
  buildGateSpellSprintQueue,
  resolveGateSprintOutcome,
} from "@/lib/explore/explore-gate-spell-sprint";

describe("buildGateSpellSprintQueue", () => {
  it("returns shuffled gate words", () => {
    const gates = [
      { id: "g1", prompt: "p", target_word: "run" },
      { id: "g2", prompt: "p", target_word: "jump" },
      { id: "g3", prompt: "p", target_word: "fast" },
    ];
    const q = buildGateSpellSprintQueue(gates, "seed-a");
    expect(q).toHaveLength(3);
    expect(q.map((w) => w.target_word).sort()).toEqual(["fast", "jump", "run"]);
    expect(buildGateSpellSprintQueue(gates, "seed-a").map((w) => w.id)).toEqual(
      q.map((w) => w.id),
    );
  });
});

describe("resolveGateSprintOutcome", () => {
  it("dodges when at or above minimum", () => {
    expect(resolveGateSprintOutcome(0, 1)).toBe("hit");
    expect(resolveGateSprintOutcome(1, 1)).toBe("dodge");
    expect(resolveGateSprintOutcome(3, 2)).toBe("dodge");
  });

  it("requires higher minimum when configured", () => {
    expect(resolveGateSprintOutcome(1, 2)).toBe("hit");
    expect(resolveGateSprintOutcome(2, 2)).toBe("dodge");
  });
});
