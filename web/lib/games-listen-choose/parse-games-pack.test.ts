import { describe, expect, it } from "vitest";
import bakeryListenChoose from "@/content/pilots/games-listen-choose/bakery-listen-choose.json";
import hobbiesListenChoose from "@/content/pilots/games-listen-choose/hobbies-listen-choose.json";
import { parseGamesListenAndChooseLessonPlayerPack } from "./parse-games-pack";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";

describe("parseGamesListenAndChooseLessonPlayerPack", () => {
  it("parses Listen and Choose Hobbies", () => {
    const pack = parseGamesListenAndChooseLessonPlayerPack(hobbiesListenChoose);
    expect(pack.activity_name).toBe("Listen and Choose Hobbies");
    expect(pack.quiz_group_title).toBe("Listen and Choose Hobbies");
    expect(pack.screens).toHaveLength(5);
    expect(pack.screens[0]?.subtype).toBe("listen_and_choose");
    expect(pack.screens[0]?.choices).toHaveLength(3);
    expect(pack.screens[0]?.choices[0]?.image_url).toMatch(
      /^\/pilots\/games-listen-choose\/hobbies\/.+\.webp$/,
    );
    expect(pack.screens[0]?.correct_choice_id).toBe("b");
  });

  it("parses the bakery pilot fixture", () => {
    const pack = parseGamesListenAndChooseLessonPlayerPack(bakeryListenChoose);
    expect(pack.screens).toHaveLength(2);
    expect(pack.screens[0]?.subtype).toBe("listen_and_choose");
    expect(pack.screens[0]?.choices).toHaveLength(3);
    expect(pack.screens[0]?.dialog_text).toMatch(/bread/i);
    expect(pack.screens[1]?.correct_choice_id).toBe("b");
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesListenAndChooseLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "listen_and_choose" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });
});

describe("listen_and_choose template", () => {
  it("parses the teacher template", () => {
    const parsed = interactionPayloadSchema.parse(
      rawInteractionTemplateForSubtype("listen_and_choose"),
    );
    expect(parsed.subtype).toBe("listen_and_choose");
    if (parsed.subtype === "listen_and_choose") {
      expect(parsed.choices).toHaveLength(3);
      expect(parsed.dialog_text).toBeTruthy();
    }
  });
});
