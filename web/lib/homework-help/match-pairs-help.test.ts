import { describe, expect, it } from "vitest";
import {
  advanceMatchPairsHelp,
  applyMatchPairsKick,
  applyMatchPairsReveal,
  applyMatchPairsScaffold,
  evaluateMatchPairsCheck,
  getMatchPairsHelpStep,
  recordMatchPairsWrongCheck,
} from "@/lib/homework-help/match-pairs";
import { emptyHelpStruggle, resolveUnlockedHelpLevel } from "@/lib/homework-help";

const TOKENS = [
  { id: "t1", label: "bread" },
  { id: "t2", label: "cake" },
  { id: "t3", label: "milk" },
];
const ZONES = [
  { id: "z1", label: "loaf" },
  { id: "z2", label: "dessert" },
  { id: "z3", label: "drink" },
];
const CORRECT = { t1: "z1", t2: "z2", t3: "z3" };

describe("match pairs check", () => {
  it("locks correct pairs and kicks wrong ones", () => {
    const result = evaluateMatchPairsCheck({
      tokenIds: ["t1", "t2", "t3"],
      correctMap: CORRECT,
      links: { t1: "z1", t2: "z1", t3: "z3" },
      lockedTokenIds: [],
    });
    expect(result.lockTokenIds).toEqual(["t1", "t3"]);
    expect(result.kickTokenIds).toEqual(["t2"]);
    expect(result.allCorrect).toBe(false);
  });

  it("ignores already-locked pairs", () => {
    const result = evaluateMatchPairsCheck({
      tokenIds: ["t1", "t2", "t3"],
      correctMap: CORRECT,
      links: { t1: "z1", t2: "z9" },
      lockedTokenIds: ["t1"],
    });
    expect(result.lockedCount).toBe(1);
    expect(result.kickTokenIds).toEqual(["t2"]);
    expect(result.missingCount).toBe(1);
  });
});

describe("match pairs help ladder", () => {
  it("advances through orient → reveal", () => {
    let struggle = emptyHelpStruggle();
    expect(resolveUnlockedHelpLevel(struggle)).toBe("orient");
    struggle = advanceMatchPairsHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("diagnose");
    struggle = advanceMatchPairsHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("scaffold");
    struggle = advanceMatchPairsHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("reveal");
  });

  it("scaffolds and reveals pairs", () => {
    const scaffold = applyMatchPairsScaffold({
      tokenIds: ["t1", "t2", "t3"],
      correctMap: CORRECT,
      links: {},
      lockedTokenIds: [],
    });
    expect(scaffold).toEqual({
      links: { t1: "z1" },
      lockedTokenIds: ["t1"],
    });

    const revealed = applyMatchPairsReveal({
      tokenIds: ["t1", "t2", "t3"],
      correctMap: CORRECT,
    });
    expect(revealed.links).toEqual(CORRECT);
    expect(revealed.lockedTokenIds).toEqual(["t1", "t2", "t3"]);
  });

  it("kicks wrong links while keeping newly locked ones", () => {
    const next = applyMatchPairsKick({
      links: { t1: "z1", t2: "z9", t3: "z3" },
      lockedTokenIds: [],
      lockTokenIds: ["t1", "t3"],
      kickTokenIds: ["t2"],
    });
    expect(next.links).toEqual({ t1: "z1", t3: "z3" });
    expect(next.lockedTokenIds.sort()).toEqual(["t1", "t3"]);
  });

  it("reveals after enough wrong checks", () => {
    const step = getMatchPairsHelpStep({
      tokens: TOKENS,
      zones: ZONES,
      correctMap: CORRECT,
      links: {},
      lockedTokenIds: [],
      struggle: recordMatchPairsWrongCheck(
        recordMatchPairsWrongCheck(recordMatchPairsWrongCheck(emptyHelpStruggle())),
      ),
    });
    expect(step.level).toBe("reveal");
    expect(step.actions).toContain("show_answer");
  });
});
