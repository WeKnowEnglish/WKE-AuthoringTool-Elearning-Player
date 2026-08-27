import { describe, expect, it } from "vitest";
import { buildHobbiesDay1BuiltinTrackPack } from "@/lib/learning-tracks/build-hobbies-day-1-builtin";
import { freezeStudioHomeworkSource } from "@/lib/class-homework/freeze-studio-source";

describe("freezeStudioHomeworkSource", () => {
  it("freezes a one-track Activity Bank source for class-page assignment", () => {
    const pack = buildHobbiesDay1BuiltinTrackPack();

    const payload = freezeStudioHomeworkSource({
      activityId: "track-1",
      format: "learning_track",
      pack,
      authoring: null,
      titleHint: "One-beat learning activity",
    });

    expect(payload.type).toBe("studio_activity");
    if (payload.type !== "studio_activity") throw new Error("Expected studio activity");
    expect(payload.format).toBe("learning_track");
    expect(payload.title).toBe("One-beat learning activity");
    expect(payload.screenCount).toBeGreaterThan(0);
  });

  it("uses the same assignability boundary for unsupported bank formats", () => {
    expect(() =>
      freezeStudioHomeworkSource({
        activityId: "vocab-1",
        format: "vocabulary_list",
        pack: {},
        authoring: null,
      }),
    ).toThrow(/learning tracks|homework modules/i);
  });
});
