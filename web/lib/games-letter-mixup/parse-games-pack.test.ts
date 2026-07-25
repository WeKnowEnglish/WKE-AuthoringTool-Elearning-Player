import { describe, expect, it } from "vitest";
import bakeryLetterMixup from "@/content/pilots/games-letter-mixup/bakery-letter-mixup.json";
import { parseGamesLetterMixupLessonPlayerPack } from "./parse-games-pack";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";

describe("parseGamesLetterMixupLessonPlayerPack", () => {
  it("parses the bakery pilot fixture", () => {
    const pack = parseGamesLetterMixupLessonPlayerPack(bakeryLetterMixup);
    expect(pack.activity_name).toBe("Bakery letter scramble");
    expect(pack.format).toBe("letter_mixup");
    expect(pack.screens).toHaveLength(4);
    expect(pack.screens[0]?.subtype).toBe("letter_mixup");
    expect(pack.screens[0]?.items[0]?.target_word).toBe("bread");
    expect(pack.screens[0]?.shuffle_letters).toBe(true);
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesLetterMixupLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "letter_mixup" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });
});

describe("letter_mixup template", () => {
  it("parses the teacher template", () => {
    const parsed = interactionPayloadSchema.parse(
      rawInteractionTemplateForSubtype("letter_mixup"),
    );
    expect(parsed.subtype).toBe("letter_mixup");
    if (parsed.subtype === "letter_mixup") {
      expect(parsed.items.length).toBeGreaterThanOrEqual(1);
    }
  });
});
