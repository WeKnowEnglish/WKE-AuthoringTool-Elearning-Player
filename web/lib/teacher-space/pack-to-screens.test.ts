import { describe, expect, it } from "vitest";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import bakeryListenChoose from "@/content/pilots/games-listen-choose/bakery-listen-choose.json";
import bakeryLineMatch from "@/content/pilots/games-line-match/bakery-line-match.json";
import bakeryTrueFalse from "@/content/pilots/games-true-false/bakery-true-false.json";
import bakerySentenceScramble from "@/content/pilots/games-sentence-scramble/bakery-sentence-scramble.json";
import bakeryFillBlanks from "@/content/pilots/games-fill-blanks/bakery-fill-blanks.json";
import { spacePackToLessonScreens } from "@/lib/teacher-space/pack-to-screens";

describe("spacePackToLessonScreens", () => {
  it("parses core quiz packs without falling through to learning track", () => {
    const cases = [
      { format: "multiple_choice" as const, pack: bakeryQuickCheck, subtype: "mc_quiz" },
      {
        format: "listen_and_choose" as const,
        pack: bakeryListenChoose,
        subtype: "listen_and_choose",
      },
      { format: "line_match" as const, pack: bakeryLineMatch, subtype: "line_match" },
      { format: "true_false" as const, pack: bakeryTrueFalse, subtype: "true_false" },
      {
        format: "sentence_scramble" as const,
        pack: bakerySentenceScramble,
        subtype: "drag_sentence",
      },
      { format: "fill_blanks" as const, pack: bakeryFillBlanks, subtype: "fill_blanks" },
    ];

    for (const row of cases) {
      const view = spacePackToLessonScreens(row.format, row.pack, "item-1");
      expect(view.screens.length).toBeGreaterThan(0);
      expect(view.lessonId).not.toContain("track");
      expect(view.screens[0]?.payload).toMatchObject({
        type: "interaction",
        subtype: row.subtype,
      });
    }
  });

  it("rejects vocabulary lists", () => {
    expect(() =>
      spacePackToLessonScreens("vocabulary_list", {}, "item-1"),
    ).toThrow(/authoring sources/i);
  });

  it("parses learning track packs into Lesson Player screens", async () => {
    const { buildHobbiesDay1BuiltinTrackPack } = await import(
      "@/lib/learning-tracks/build-hobbies-day-1-builtin"
    );
    const view = spacePackToLessonScreens(
      "learning_track",
      buildHobbiesDay1BuiltinTrackPack(),
      "track-1",
    );
    expect(view.screens.length).toBeGreaterThan(0);
    expect(view.lessonId).toContain("track");
  });
});
