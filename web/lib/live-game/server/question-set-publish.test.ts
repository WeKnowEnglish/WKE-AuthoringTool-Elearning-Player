import { describe, expect, it } from "vitest";
import { validateSetForPublish } from "@/lib/live-game/server/question-set-publish";
import type {
  LiveGameQuestionRow,
  LiveGameQuestionSetRow,
} from "@/lib/live-game/question-banks/types";

function baseSet(overrides: Partial<LiveGameQuestionSetRow> = {}): LiveGameQuestionSetRow {
  return {
    id: "set-1",
    slug: "test-set",
    title: "Test Set",
    level: "A1",
    topic: "topic",
    learningObjective: "objective",
    description: "",
    version: 1,
    status: "draft",
    visibility: "teacher",
    sortOrder: 0,
    ...overrides,
  };
}

function question(
  bank: LiveGameQuestionRow["bank"],
  overrides: Partial<LiveGameQuestionRow> = {},
): LiveGameQuestionRow {
  const payloads = {
    harvest: {
      type: "multiple_choice" as const,
      options: ["a", "b"],
      correctAnswers: ["a"],
    },
    deposit: {
      type: "deposit_spell" as const,
      targetWord: "word",
      spellHint: "hint",
    },
    craft: {
      type: "drag_sentence" as const,
      wordBank: ["I"],
      correctOrder: ["I"],
      slotCount: 1,
    },
  };
  return {
    id: `${bank}-1`,
    setId: "set-1",
    bank,
    sortOrder: 0,
    prompt: "Prompt",
    payload: payloads[bank],
    enabled: true,
    legacySourceId: null,
    ...overrides,
  };
}

describe("validateSetForPublish", () => {
  it("blocks publish when title is empty", () => {
    const result = validateSetForPublish(baseSet({ title: "   " }), [
      question("harvest"),
      question("deposit"),
      question("craft"),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Title");
  });

  it("blocks publish when a bank has no enabled questions", () => {
    const result = validateSetForPublish(baseSet(), [
      question("harvest"),
      question("deposit", { enabled: false }),
      question("craft"),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.bank).toBe("deposit");
  });

  it("blocks publish when craft payload multiset is invalid", () => {
    const result = validateSetForPublish(baseSet(), [
      question("harvest"),
      question("deposit"),
      question("craft", {
        payload: {
          type: "drag_sentence",
          wordBank: ["I", "play"],
          correctOrder: ["I", "run"],
          slotCount: 2,
        },
      }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.bank).toBe("craft");
  });

  it("warns when harvest enabled count is below 10", () => {
    const result = validateSetForPublish(baseSet(), [
      question("harvest"),
      question("deposit"),
      question("craft"),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.some((warning) => warning.includes("10"))).toBe(true);
    }
  });

  it("passes a valid set with all banks enabled", () => {
    const harvest = Array.from({ length: 10 }, (_, index) =>
      question("harvest", { id: `harvest-${index}`, sortOrder: index }),
    );
    const result = validateSetForPublish(baseSet(), [
      ...harvest,
      question("deposit"),
      question("craft"),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toHaveLength(0);
  });
});
