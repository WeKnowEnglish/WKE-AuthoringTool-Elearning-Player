import { describe, expect, it } from "vitest";
import { interactionPayloadSchema, storyPayloadSchema } from "@/lib/lesson-schemas";
import { coerceGeminiInteractionPayload, coerceGeminiStoryPayload } from "./gemini";

describe("coerceGeminiStoryPayload", () => {
  it("adds type, body_text from first page, and page ids", () => {
    const raw = {
      layout_mode: "book",
      pages: [{ body_text: "Hello class" }],
    };
    const parsed = storyPayloadSchema.parse(coerceGeminiStoryPayload(raw));
    expect(parsed.type).toBe("story");
    expect(parsed.body_text).toBe("Hello class");
    expect(parsed.pages?.[0]?.id).toBe("page_1");
  });
});

describe("coerceGeminiInteractionPayload", () => {
  it("adds type and defaults subtype", () => {
    const raw = {
      question: "Pick one",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      correct_option_id: "a",
    };
    const parsed = interactionPayloadSchema.parse(coerceGeminiInteractionPayload(raw));
    expect(parsed.type).toBe("interaction");
    expect(parsed.subtype).toBe("mc_quiz");
  });
});
