import { describe, expect, it } from "vitest";
import bakerySentenceScramble from "@/content/pilots/games-sentence-scramble/bakery-sentence-scramble.json";
import { parseGamesSentenceScrambleLessonPlayerPack } from "./parse-games-pack";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";

describe("parseGamesSentenceScrambleLessonPlayerPack", () => {
  it("parses the bakery pilot fixture", () => {
    const pack = parseGamesSentenceScrambleLessonPlayerPack(bakerySentenceScramble);
    expect(pack.activity_name).toBe("Bakery sentence scramble");
    expect(pack.format).toBe("sentence_scramble");
    expect(pack.screens).toHaveLength(4);
    expect(pack.screens[0]?.subtype).toBe("drag_sentence");
    expect(pack.screens[0]?.correct_order).toEqual([
      "We",
      "buy",
      "bread",
      "at",
      "the",
      "bakery.",
    ]);
    expect(pack.screens[0]?.word_bank).toHaveLength(6);
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesSentenceScrambleLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "sentence_scramble" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });
});

describe("drag_sentence template", () => {
  it("parses the teacher template", () => {
    const parsed = interactionPayloadSchema.parse(
      rawInteractionTemplateForSubtype("drag_sentence"),
    );
    expect(parsed.subtype).toBe("drag_sentence");
    if (parsed.subtype === "drag_sentence") {
      expect(parsed.correct_order.length).toBeGreaterThanOrEqual(2);
    }
  });
});
