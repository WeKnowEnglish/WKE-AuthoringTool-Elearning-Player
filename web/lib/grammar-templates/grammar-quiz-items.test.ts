import { describe, expect, it } from "vitest";
import microSkillsExport from "@/docs/grammar-knowledge-engine/exports/micro-skills-a1-a2.json";
import {
  buildGrammarTrueFalsePayload,
  getGrammarQuizItemForLessonScreen,
  getGrammarQuizItems,
  hasGrammarQuiz,
} from "./grammar-quiz-items";

const GKE_MICRO_SKILL_IDS = new Set(
  microSkillsExport.records.map((record) => record.id),
);

describe("grammar-quiz-items", () => {
  it("registers short answers quiz items", () => {
    expect(hasGrammarQuiz("short-answers-there-is-a1")).toBe(true);
    expect(getGrammarQuizItems("short-answers-there-is-a1")).toHaveLength(3);
  });

  it("builds parseable true_false payloads", () => {
    const item = getGrammarQuizItems("short-answers-there-is-a1")[0]!;
    const payload = buildGrammarTrueFalsePayload(item);

    expect(payload.subtype).toBe("true_false");
    expect(payload.statement).toBeTruthy();
    expect(typeof payload.correct).toBe("boolean");
  });

  it("maps lesson screens back to registry items", () => {
    const item = getGrammarQuizItemForLessonScreen({
      lessonId: "grammar-short-answers-there-is-a1",
      screenId: "grammar-short-answers-there-is-a1-quiz-sa-tf-2",
    });

    expect(item?.id).toBe("sa-tf-2");
    expect(item?.microSkillId).toContain("short_answers.positive_negative_plural");
  });

  it("requires microSkillId on every quiz item and matches GKE exports", () => {
    for (const items of [
      getGrammarQuizItems("short-answers-there-is-a1"),
    ]) {
      for (const item of items) {
        expect(item.microSkillId.trim().length).toBeGreaterThan(0);
        expect(GKE_MICRO_SKILL_IDS.has(item.microSkillId)).toBe(true);
      }
    }
  });
});
