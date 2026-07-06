import { describe, expect, it } from "vitest";
import { grammarPayloadSchema } from "@/lib/lesson-schemas";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import { buildGrammarPosterScreens, grammarLessonId } from "./build-screens";

describe("buildGrammarPosterScreens", () => {
  it("builds start, grammar, quiz, and finish screens for short answers", () => {
    const screens = buildGrammarPosterScreens("short-answers-there-is-a1");

    expect(screens).toHaveLength(6);
    expect(screens[0]?.screen_type).toBe("start");
    expect(screens[1]?.screen_type).toBe("grammar");
    expect(screens[2]?.screen_type).toBe("interaction");
    expect(screens[3]?.screen_type).toBe("interaction");
    expect(screens[4]?.screen_type).toBe("interaction");
    expect(screens[5]?.screen_type).toBe("start");
    expect(grammarLessonId("short-answers-there-is-a1")).toBe(
      "grammar-short-answers-there-is-a1",
    );

    const grammarPayload = grammarPayloadSchema.parse(screens[1]?.payload);
    expect(grammarPayload.grammar_slug).toBe("short-answers-there-is-a1");
    expect(grammarPayload.mode).toBe("read_then_quiz");

    const parsed = parseScreenPayload("grammar", screens[1]?.payload);
    expect(parsed?.type).toBe("grammar");

    const quizPayload = parseScreenPayload("interaction", screens[2]?.payload);
    expect(quizPayload?.type).toBe("interaction");
    if (quizPayload?.type === "interaction") {
      expect(quizPayload.subtype).toBe("true_false");
    }
  });

  it("builds read-only screens when quiz is disabled", () => {
    const screens = buildGrammarPosterScreens("short-answers-there-is-a1", {
      includeQuiz: false,
    });

    expect(screens).toHaveLength(3);
    const grammarPayload = grammarPayloadSchema.parse(screens[1]?.payload);
    expect(grammarPayload.mode).toBe("read");
  });

  it("throws for unknown slugs", () => {
    expect(() => buildGrammarPosterScreens("not-a-real-slug")).toThrow(/not published/i);
  });
});
