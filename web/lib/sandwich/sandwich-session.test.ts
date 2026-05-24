import { describe, expect, it } from "vitest";
import { buildFixPrompt } from "@/lib/sandwich/sandwich-fix-prompts";
import { SANDWICH_INGREDIENTS } from "@/lib/sandwich/sandwich-ingredients";
import { createMainRequests, pickDistinctIngredients } from "@/lib/sandwich/sandwich-requests";
import {
  availableIngredientIds,
  buildFixRoundContext,
  canPickIngredient,
  createIngredientTracker,
  createSandwichSession,
  lastFailedSlotIndex,
  markIngredientUsed,
  scoreFixRound,
  scoreMainRound,
  scoreSlot,
} from "@/lib/sandwich/sandwich-session";

describe("pickDistinctIngredients", () => {
  it("returns unique ingredient ids", () => {
    const picked = pickDistinctIngredients(4, () => 0.1);
    expect(new Set(picked).size).toBe(4);
  });

  it("createMainRequests always has 4 distinct", () => {
    for (let i = 0; i < 20; i++) {
      const reqs = createMainRequests(() => Math.random());
      expect(new Set(reqs).size).toBe(4);
    }
  });
});

describe("scoreSlot", () => {
  it("matches per slot only by ingredient id", () => {
    expect(scoreSlot("lettuce", "lettuce")).toBe(true);
    expect(scoreSlot("tomato", "lettuce")).toBe(false);
  });
});

describe("lastFailedSlotIndex", () => {
  it("returns the highest-index wrong slot", () => {
    expect(lastFailedSlotIndex([false, true, false, true])).toBe(2);
    expect(lastFailedSlotIndex([true, false, false, true])).toBe(2);
    expect(lastFailedSlotIndex([true, true, true, false])).toBe(3);
  });

  it("returns undefined when all correct", () => {
    expect(lastFailedSlotIndex([true, true, true, true])).toBeUndefined();
  });
});

describe("scoreMainRound", () => {
  const requests = ["lettuce", "tomato", "onion", "cheese"] as const;

  it("good when all four slots match", () => {
    const result = scoreMainRound(
      ["lettuce", "tomato", "onion", "cheese"],
      requests,
    );
    expect(result.tier).toBe("good");
    expect(result.matchCount).toBe(4);
    expect(result.failedSlotIndex).toBeUndefined();
  });

  it("ok with three matches — failed slot is last wrong", () => {
    const result = scoreMainRound(
      ["lettuce", "tomato", "onion", "meat"],
      requests,
    );
    expect(result.tier).toBe("ok");
    expect(result.matchCount).toBe(3);
    expect(result.failedSlotIndex).toBe(3);
  });

  it("ok with two matches — failed slot is last wrong (not first)", () => {
    const result = scoreMainRound(
      ["lettuce", "meat", "onion", "chicken"],
      requests,
    );
    expect(result.tier).toBe("ok");
    expect(result.matchCount).toBe(2);
    expect(result.failedSlotIndex).toBe(3);
  });

  it("bad with 0-1 matches", () => {
    expect(
      scoreMainRound(["meat", "chicken", "ketchup", "mayonnaise"], requests).tier,
    ).toBe("bad");
    expect(
      scoreMainRound(["lettuce", "meat", "chicken", "ketchup"], requests).matchCount,
    ).toBe(1);
  });
});

describe("ingredient tracker", () => {
  it("disallows reusing consumed ingredients", () => {
    let tracker = createIngredientTracker();
    expect(canPickIngredient(tracker, "lettuce")).toBe(true);
    tracker = markIngredientUsed(tracker, "lettuce");
    expect(canPickIngredient(tracker, "lettuce")).toBe(false);
    const allIds = SANDWICH_INGREDIENTS.map((i) => i.id);
    expect(availableIngredientIds(tracker, allIds)).not.toContain("lettuce");
  });

  it("keeps wrong ingredient locked after fix phase would start", () => {
    let tracker = createIngredientTracker();
    tracker = markIngredientUsed(tracker, "meat");
    expect(canPickIngredient(tracker, "meat")).toBe(false);
    tracker = markIngredientUsed(tracker, "lettuce");
    expect(canPickIngredient(tracker, "meat")).toBe(false);
    expect(canPickIngredient(tracker, "lettuce")).toBe(false);
  });
});

describe("buildFixPrompt", () => {
  it("names the requested ingredient", () => {
    const prompt = buildFixPrompt({
      requested: "lettuce",
      pickedIngredientId: "tomato",
    });
    expect(prompt.line).toContain("lettuce");
    expect(prompt.targetIngredientId).toBe("lettuce");
    expect(prompt.highlightWord).toBe("lettuce");
  });
});

describe("buildFixRoundContext", () => {
  it("uses last failed slot request and pick", () => {
    const requests = ["lettuce", "tomato", "onion", "cheese"] as const;
    const picks = ["lettuce", "meat", "onion", "chicken"] as const;
    const main = scoreMainRound(picks, requests);
    expect(main.tier).toBe("ok");
    expect(main.failedSlotIndex).toBe(3);
    const fix = buildFixRoundContext(requests, picks, main.failedSlotIndex!);
    expect(fix.targetIngredientId).toBe("cheese");
    expect(fix.line).toContain("cheese");
  });
});

describe("scoreFixRound", () => {
  it("grades fix pick against target ingredient id only", () => {
    expect(scoreFixRound("cheese", "cheese")).toBe("good");
    expect(scoreFixRound("lettuce", "cheese")).toBe("bad");
  });
});

describe("createSandwichSession", () => {
  it("returns four requests", () => {
    const session = createSandwichSession(() => 0.5);
    expect(session.requests).toHaveLength(4);
  });
});
