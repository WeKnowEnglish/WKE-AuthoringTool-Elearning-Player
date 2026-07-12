import { describe, expect, it } from "vitest";
import { LIVE_GAME_QUESTION_SET_SUMMARIES } from "@/lib/live-game/modes/english-craft/question-sets-client";
import {
  getCraftQuestionFromSet,
  getLiveGameQuestionSet,
  isQuestionSetAnswerCorrect,
  isQuestionSetCraftAnswerCorrect,
} from "@/lib/live-game/modes/english-craft/question-sets";

describe("English Craft curated question sets", () => {
  it("provides a validated playable deck for every host option", () => {
    for (const summary of LIVE_GAME_QUESTION_SET_SUMMARIES) {
      const set = getLiveGameQuestionSet(summary.id);
      expect(set.version).toBe(summary.version);
      expect(set.questions.length).toBeGreaterThanOrEqual(6);
      expect(new Set(set.questions.map((question) => question.id)).size).toBe(set.questions.length);
      expect(summary.questionCount).toBe(set.questions.length + 1);
    }
  });

  it("validates answers only within the selected set", () => {
    const set = getLiveGameQuestionSet("daily-routines-a1");
    const question = set.questions[0]!;
    expect(isQuestionSetAnswerCorrect(set.id, question.id, question.correctAnswer)).toBe(true);
    expect(isQuestionSetAnswerCorrect("school-life-a1", question.id, question.correctAnswer)).toBe(false);
  });

  it("uses each set's own bridge sentence", () => {
    for (const summary of LIVE_GAME_QUESTION_SET_SUMMARIES) {
      const craft = getCraftQuestionFromSet(summary.id);
      expect(isQuestionSetCraftAnswerCorrect(summary.id, craft.id, craft.correctOrder)).toBe(true);
    }
  });
});
