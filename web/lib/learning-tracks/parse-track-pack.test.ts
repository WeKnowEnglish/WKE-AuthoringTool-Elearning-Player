import { describe, expect, it } from "vitest";
import { buildHobbiesDay1BuiltinTrackPack } from "./build-hobbies-day-1-builtin";
import { parseLearningTrackLessonPlayerPack } from "./parse-track-pack";

describe("learning-track pack", () => {
  it("builds and re-parses hobbies day-1 builtin", () => {
    const builtin = buildHobbiesDay1BuiltinTrackPack();
    expect(builtin.kind).toBe("lessonplayer-track-pack");
    expect(builtin.screens.length).toBeGreaterThan(3);
    expect(builtin.screens[0]?.type).toBe("interaction");

    const parsed = parseLearningTrackLessonPlayerPack(builtin);
    expect(parsed.id).toBe("hobbies-day-1");
    expect(parsed.screens.length).toBe(builtin.screens.length);
  });

  it("rejects wrong kind", () => {
    expect(() =>
      parseLearningTrackLessonPlayerPack({
        version: 1,
        kind: "lessonplayer-games-pack",
        screens: [],
      }),
    ).toThrow(/lessonplayer-track-pack/);
  });
});
