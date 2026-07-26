import { describe, expect, it } from "vitest";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import { freezeStudioActivityHomeworkPayload } from "@/lib/class-homework/freeze-studio-activity";

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

  it("rejects learning tracks and vocabulary lists", () => {
    expect(() =>
      freezeStudioActivityHomeworkPayload({
        activityId: "act-1",
        format: "learning_track",
        pack: {},
      }),
    ).toThrow(/homework/i);

    expect(() =>
      freezeStudioActivityHomeworkPayload({
        activityId: "act-1",
        format: "vocabulary_list",
        pack: {},
      }),
    ).toThrow(/homework/i);
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
