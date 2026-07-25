import { describe, expect, it } from "vitest";
import bakeryLineMatch from "@/content/pilots/games-line-match/bakery-line-match.json";
import { parseGamesLineMatchLessonPlayerPack } from "./parse-games-pack";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";

describe("parseGamesLineMatchLessonPlayerPack", () => {
  it("parses the bakery fixture", () => {
    const pack = parseGamesLineMatchLessonPlayerPack(bakeryLineMatch);
    expect(pack.format).toBe("line_match");
    expect(pack.screens).toHaveLength(2);
    expect(pack.screens[0]?.subtype).toBe("line_match");
    expect(pack.screens[0]?.tokens).toHaveLength(3);
    expect(pack.screens[0]?.correct_map.tok_jam).toBe("z_sweet");
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesLineMatchLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "line_match" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });
});

describe("line_match template", () => {
  it("parses the teacher template", () => {
    const parsed = interactionPayloadSchema.parse(
      rawInteractionTemplateForSubtype("line_match"),
    );
    expect(parsed.subtype).toBe("line_match");
  });
});
