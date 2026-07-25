import { describe, expect, it } from "vitest";
import bakeryFillBlanks from "@/content/pilots/games-fill-blanks/bakery-fill-blanks.json";
import { parseGamesFillBlanksLessonPlayerPack } from "./parse-games-pack";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";

describe("parseGamesFillBlanksLessonPlayerPack", () => {
  it("parses the bakery pilot fixture", () => {
    const pack = parseGamesFillBlanksLessonPlayerPack(bakeryFillBlanks);
    expect(pack.activity_name).toBe("Bakery fill in the blanks");
    expect(pack.format).toBe("fill_blanks");
    expect(pack.screens).toHaveLength(3);
    expect(pack.screens[0]?.subtype).toBe("fill_blanks");
    expect(pack.screens[0]?.template).toContain("__1__");
    expect(pack.screens[0]?.blanks[0]?.acceptable).toContain("eggs");
    expect(pack.screens[0]?.word_bank).toContain("eggs");
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesFillBlanksLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "fill_blanks" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });
});

describe("fill_blanks template", () => {
  it("parses the teacher template", () => {
    const parsed = interactionPayloadSchema.parse(
      rawInteractionTemplateForSubtype("fill_blanks"),
    );
    expect(parsed.subtype).toBe("fill_blanks");
    if (parsed.subtype === "fill_blanks") {
      expect(parsed.blanks.length).toBeGreaterThanOrEqual(1);
    }
  });
});
