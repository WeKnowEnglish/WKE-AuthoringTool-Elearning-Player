import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  isCraftOrderCorrect,
  isDepositSpellCorrect,
  isHarvestAnswerCorrect,
} from "@/lib/live-game/question-banks/schemas";
import { hashChallengeIdForDiagnostic, jsonAnswerResponse } from "@/lib/live-game/server/answer-timing";

function source(relativeUrl: string) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

describe("answer secrecy and grading", () => {
  it("grades harvest without exposing answer keys in the validator result", () => {
    const payload = {
      type: "multiple_choice" as const,
      options: ["A", "B", "C"],
      correctAnswers: ["B"],
    };
    expect(isHarvestAnswerCorrect(payload, "B")).toBe(true);
    expect(isHarvestAnswerCorrect(payload, "A")).toBe(false);
  });

  it("grades deposit and craft without returning keys", () => {
    expect(
      isDepositSpellCorrect(
        { type: "deposit_spell", targetWord: "wood", letterTiles: ["w", "o", "o", "d"] },
        "wood",
      ),
    ).toBe(true);
    expect(
      isCraftOrderCorrect(
        { type: "drag_sentence", words: ["I", "build"], correctOrder: ["I", "build"] },
        ["I", "build"],
      ),
    ).toBe(true);
    expect(
      isCraftOrderCorrect(
        { type: "drag_sentence", words: ["I", "build"], correctOrder: ["I", "build"] },
        ["build", "I"],
      ),
    ).toBe(false);
  });
});

describe("answer timing helpers", () => {
  it("hashes challenge ids without returning the raw id", () => {
    const hash = hashChallengeIdForDiagnostic("ch_abcdef0123456789abcdef01");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    expect(hash).not.toContain("ch_");
  });

  it("measures minimal incorrect response bytes", () => {
    const minimal = jsonAnswerResponse({ correct: false });
    const bloated = jsonAnswerResponse({
      correct: false,
      poolTotal: { wood: 1, stone: 2, wheat: 3, cotton: 4 },
      craftedItems: { benchBuilt: true, hammers: 2, boat: false },
      prompt: "secret",
      correctAnswers: ["nope"],
    });
    expect(minimal.bytes).toBeLessThan(bloated.bytes);
    expect(JSON.parse(JSON.stringify({ correct: false }))).not.toHaveProperty("correctAnswers");
  });
});

describe("answer route recovery contracts", () => {
  it("releases award claims when Liveblocks mutation fails", () => {
    for (const route of [
      "../../../app/api/live-game/answer/route.ts",
      "../../../app/api/live-game/deposit/answer/route.ts",
      "../../../app/api/live-game/craft/answer/route.ts",
    ]) {
      const routeSource = source(route);
      expect(routeSource).toContain("releaseLiveGameChallengeAwardClaim");
      expect(routeSource).toContain("mutate_failed_released");
      expect(routeSource).toContain('status: 503');
    }
  });

  it("prefers receipt replay over a second Liveblocks read when possible", () => {
    const harvest = source("../../../app/api/live-game/answer/route.ts");
    const deposit = source("../../../app/api/live-game/deposit/answer/route.ts");
    expect(harvest).toContain("receiptFromStorage");
    expect(deposit).toContain("receiptFromStorage");
    expect(harvest).toContain("incorrect_minimal");
    expect(deposit).toContain("incorrect_minimal");
  });

  it("does not put answer keys into incorrect response helpers", () => {
    for (const route of [
      "../../../app/api/live-game/answer/route.ts",
      "../../../app/api/live-game/deposit/answer/route.ts",
      "../../../app/api/live-game/craft/answer/route.ts",
    ]) {
      const routeSource = source(route);
      expect(routeSource).toMatch(/function \w+IncorrectPayload/);
      expect(routeSource).not.toMatch(/IncorrectPayload[\s\S]{0,200}correctAnswers/);
      expect(routeSource).not.toMatch(/IncorrectPayload[\s\S]{0,200}targetWord/);
      expect(routeSource).not.toMatch(/IncorrectPayload[\s\S]{0,200}correctOrder/);
    }
  });

  it("records client click-to-visible answer marks", () => {
    for (const hook of [
      "../hooks/useLiveGameHarvestChallenge.ts",
      "../hooks/useLiveGameDepositChallenge.ts",
      "../hooks/useLiveGameCraftChallenge.ts",
    ]) {
      const hookSource = source(hook);
      expect(hookSource).toContain("answer_submit_clicked");
      expect(hookSource).toContain("authoritative_result_received");
      expect(hookSource).toContain("result_visible");
      expect(hookSource).toContain("setLastResult(null)");
      expect(hookSource).toContain("setIsSubmitting(true)");
    }
  });
});
