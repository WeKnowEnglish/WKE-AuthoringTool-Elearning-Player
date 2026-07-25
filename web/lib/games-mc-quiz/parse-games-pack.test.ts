import { describe, expect, it } from "vitest";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import { parseGamesMcQuizLessonPlayerPack } from "./parse-games-pack";

describe("parseGamesMcQuizLessonPlayerPack", () => {
  it("parses the bakery pilot fixture", () => {
    const pack = parseGamesMcQuizLessonPlayerPack(bakeryQuickCheck);
    expect(pack.screens).toHaveLength(3);
    expect(pack.screens[0]?.subtype).toBe("mc_quiz");
    expect(pack.screens.every((s) => s.quiz_group_id === "bakery-quick-check")).toBe(true);
    expect(pack.screens[1]?.correct_option_id).toBe("b");
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesMcQuizLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "multiple_choice" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });

  it("keeps optional prompt_audio_url on screens", () => {
    const pack = parseGamesMcQuizLessonPlayerPack({
      version: 1,
      kind: "lessonplayer-games-pack",
      format: "multiple_choice",
      quiz_group_id: "audio-check",
      quiz_group_title: "Audio check",
      activity_name: "Audio check",
      screens: [
        {
          type: "interaction",
          subtype: "mc_quiz",
          question: "What is this?",
          options: [
            { id: "a", label: "Bread" },
            { id: "b", label: "Milk" },
          ],
          correct_option_id: "a",
          prompt_audio_url: "data:audio/webm;base64,AAA",
          quiz_group_id: "audio-check",
          quiz_group_title: "Audio check",
          quiz_group_order: 0,
        },
      ],
    });
    expect(pack.screens[0]?.prompt_audio_url).toBe("data:audio/webm;base64,AAA");
  });
});
