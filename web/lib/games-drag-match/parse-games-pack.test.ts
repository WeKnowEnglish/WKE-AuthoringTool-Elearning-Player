import { describe, expect, it } from "vitest";
import bakeryDragMatch from "@/content/pilots/games-drag-match/bakery-drag-match.json";
import { parseGamesDragMatchLessonPlayerPack } from "./parse-games-pack";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";

describe("parseGamesDragMatchLessonPlayerPack", () => {
  it("parses the bakery fixture", () => {
    const pack = parseGamesDragMatchLessonPlayerPack(bakeryDragMatch);
    expect(pack.format).toBe("drag_match");
    expect(pack.screens).toHaveLength(2);
    expect(pack.screens[0]?.subtype).toBe("drag_match");
    expect(pack.screens[0]?.tokens).toHaveLength(3);
    expect(pack.screens[0]?.correct_map.tok_bread).toBe("z_loaf");
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesDragMatchLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "drag_match" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });
});

describe("drag_match template", () => {
  it("parses the teacher template", () => {
    const parsed = interactionPayloadSchema.parse(
      rawInteractionTemplateForSubtype("drag_match"),
    );
    expect(parsed.subtype).toBe("drag_match");
  });
});
