import { describe, expect, it } from "vitest";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import { freezeStudioActivityHomeworkPayload } from "@/lib/class-homework/freeze-studio-activity";
import { buildHobbiesDay1BuiltinTrackPack } from "@/lib/learning-tracks/build-hobbies-day-1-builtin";

describe("freezeStudioActivityHomeworkPayload", () => {
  it("freezes a bank MCQ pack into studio_activity homework", () => {
    const payload = freezeStudioActivityHomeworkPayload({
      activityId: "act-1",
      format: "multiple_choice",
      pack: bakeryQuickCheck,
      titleHint: "Bakery homework",
    });
    expect(payload.type).toBe("studio_activity");
    expect(payload.activityId).toBe("act-1");
    expect(payload.format).toBe("multiple_choice");
    expect(payload.title).toBe("Bakery homework");
    expect(payload.screenCount).toBeGreaterThan(0);
    expect(payload.pack).toBeTruthy();
    expect(payload.pack).not.toBe(bakeryQuickCheck);
    expect(payload.frozenAt).toMatch(/^\d{4}-/);
  });

  it("freezes a learning track pack into studio_activity homework", () => {
    const trackPack = buildHobbiesDay1BuiltinTrackPack();
    const payload = freezeStudioActivityHomeworkPayload({
      activityId: "act-track",
      format: "learning_track",
      pack: trackPack,
      titleHint: "Hobbies Day 1",
    });
    expect(payload.type).toBe("studio_activity");
    expect(payload.format).toBe("learning_track");
    expect(payload.title).toBe("Hobbies Day 1");
    expect(payload.screenCount).toBeGreaterThan(0);
    expect(payload.pack).not.toBe(trackPack);
  });

  it("rejects vocabulary lists", () => {
    expect(() =>
      freezeStudioActivityHomeworkPayload({
        activityId: "act-1",
        format: "vocabulary_list",
        pack: {},
      }),
    ).toThrow(/homework|Vocabulary/i);
  });

  it("freezes listen_and_choose into studio_activity homework", async () => {
    const bakeryListenChoose = (
      await import("@/content/pilots/games-listen-choose/bakery-listen-choose.json")
    ).default;
    const payload = freezeStudioActivityHomeworkPayload({
      activityId: "act-listen",
      format: "listen_and_choose",
      pack: bakeryListenChoose,
      titleHint: "Listen homework",
    });
    expect(payload.format).toBe("listen_and_choose");
    expect(payload.screenCount).toBeGreaterThan(0);
  });

  it("rejects empty activity id", () => {
    expect(() =>
      freezeStudioActivityHomeworkPayload({
        activityId: "  ",
        format: "multiple_choice",
        pack: bakeryQuickCheck,
      }),
    ).toThrow(/Activity Bank/i);
  });
});
