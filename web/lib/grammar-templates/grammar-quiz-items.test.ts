import { describe, expect, it } from "vitest";
import {
  buildGrammarTrueFalsePayload,
  getGrammarQuizItems,
  hasGrammarQuiz,
} from "./grammar-quiz-items";

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
});
