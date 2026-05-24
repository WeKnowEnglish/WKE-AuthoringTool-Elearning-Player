import { describe, expect, it } from "vitest";
import { createMainRequests, pickDistinctAdjectives } from "@/lib/blender/drink-adjectives";
import { buildFixPrompt } from "@/lib/blender/drink-fix-prompts";
import { DRINK_INGREDIENTS } from "@/lib/blender/drink-ingredients";
import {
  availableIngredientIds,
  buildFixRoundContext,
  canPickIngredient,
  createDrinkSession,
  createIngredientTracker,
  markIngredientUsed,
  scoreFixRound,
  scoreMainRound,
  scoreSlot,
} from "@/lib/blender/drink-session";

describe("pickDistinctAdjectives", () => {
  it("returns unique adjectives", () => {
    const picked = pickDistinctAdjectives(3, () => 0.1);
    expect(new Set(picked).size).toBe(3);
  });

  it("createMainRequests always has 3 distinct", () => {
    for (let i = 0; i < 20; i++) {
      const reqs = createMainRequests(() => Math.random());
      expect(new Set(reqs).size).toBe(3);
    }
  });
});

describe("scoreSlot", () => {
  it("matches per slot only", () => {
    expect(scoreSlot("strawberry", "sweet")).toBe(true);
    expect(scoreSlot("strawberry", "red")).toBe(true);
    expect(scoreSlot("apple", "sour")).toBe(false);
  });
});

describe("scoreMainRound", () => {
  const requests = ["sweet", "red", "sour"] as const;

  it("good when all three slots match", () => {
    const result = scoreMainRound(["banana", "apple", "lemon"], requests);
    expect(result.tier).toBe("good");
    expect(result.matchCount).toBe(3);
    expect(result.failedSlotIndex).toBeUndefined();
  });

  it("ok with exactly one failed slot", () => {
    const result = scoreMainRound(["banana", "grape", "lemon"], requests);
    expect(result.tier).toBe("ok");
    expect(result.matchCount).toBe(2);
    expect(result.failedSlotIndex).toBe(1);
  });

  it("bad with 0-1 matches", () => {
    expect(scoreMainRound(["lemon", "grape", "apple"], requests).tier).toBe("bad");
    expect(scoreMainRound(["pineapple", "grape", "blueberry"], requests).matchCount).toBe(
      0,
    );
  });
});

describe("ingredient tracker", () => {
  it("disallows reusing consumed ingredients", () => {
    let tracker = createIngredientTracker();
    expect(canPickIngredient(tracker, "strawberry")).toBe(true);
    tracker = markIngredientUsed(tracker, "strawberry");
    expect(canPickIngredient(tracker, "strawberry")).toBe(false);
    const allIds = DRINK_INGREDIENTS.map((i) => i.id);
    expect(availableIngredientIds(tracker, allIds)).not.toContain("strawberry");
  });
});

describe("buildFixPrompt", () => {
  it("sour request + apple pick → too sweet", () => {
    const prompt = buildFixPrompt({ requested: "sour", pickedIngredientId: "apple" });
    expect(prompt.line).toContain("sweet");
    expect(prompt.line).toContain("sour");
    expect(prompt.targetAdjective).toBe("sour");
    expect(prompt.cueEmoji).toBe("🍋");
  });

  it("red request + grape pick → too green", () => {
    const prompt = buildFixPrompt({ requested: "red", pickedIngredientId: "grape" });
    expect(prompt.line.toLowerCase()).toContain("green");
    expect(prompt.targetAdjective).toBe("red");
  });
});

describe("buildFixRoundContext", () => {
  it("uses failed slot request and pick", () => {
    const requests = ["sour", "red", "cold"] as const;
    const picks = ["apple", "strawberry", "ice"] as const;
    const main = scoreMainRound(picks, requests);
    expect(main.tier).toBe("ok");
    expect(main.failedSlotIndex).toBe(0);
    const fix = buildFixRoundContext(requests, picks, main.failedSlotIndex!);
    expect(fix.targetAdjective).toBe("sour");
    expect(fix.line.toLowerCase()).toContain("sweet");
  });
});

describe("scoreFixRound", () => {
  it("grades fix pick against target adjective only", () => {
    expect(scoreFixRound("lemon", "sour")).toBe("good");
    expect(scoreFixRound("banana", "sour")).toBe("bad");
  });
});

describe("createDrinkSession", () => {
  it("returns three requests", () => {
    const session = createDrinkSession(() => 0.5);
    expect(session.requests).toHaveLength(3);
  });
});
