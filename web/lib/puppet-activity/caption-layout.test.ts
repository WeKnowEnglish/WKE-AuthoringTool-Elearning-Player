import { describe, expect, it } from "vitest";
import { DEMO_AM_WITH_I } from "./scripts/demo-am-with-i";
import { LIKE_LIKES_FOOD } from "./scripts/like-likes-food";
import {
  clampCaptionLayout,
  resolveCaptionLayout,
  validateCaptionLayout,
} from "./caption-layout";

describe("caption-layout", () => {
  it("merges beat, script default, and overrides", () => {
    const beat = DEMO_AM_WITH_I.beats[2]!;
    expect(beat.kind).toBe("line");
    if (beat.kind !== "line") return;

    const resolved = resolveCaptionLayout(beat, DEMO_AM_WITH_I, 2, {
      2: { xPercent: 10, yPercent: 20 },
    });
    expect(resolved.xPercent).toBe(10);
    expect(resolved.yPercent).toBe(20);
  });

  it("clamps out-of-range values", () => {
    expect(clampCaptionLayout({ xPercent: 0, yPercent: 100, scale: 5 }).xPercent).toBe(5);
    expect(clampCaptionLayout({ xPercent: 50, yPercent: 50, scale: 5 }).scale).toBe(1.6);
    expect(clampCaptionLayout({ xPercent: 50, yPercent: 50, scale: 0.1 }).scale).toBe(0.35);
  });

  it("applies role presets when resolving", () => {
    const beat = LIKE_LIKES_FOOD.beats.find((b) => b.kind === "line" && b.text === "like")!;
    expect(beat.kind).toBe("line");
    if (beat.kind !== "line") return;
    const beatIndex = LIKE_LIKES_FOOD.beats.indexOf(beat);
    const resolved = resolveCaptionLayout(beat, LIKE_LIKES_FOOD, beatIndex);
    expect(resolved.size).toBe("sm");
    expect(resolved.showPanel).toBe(false);
  });

  it("validates layout ranges", () => {
    expect(validateCaptionLayout({ xPercent: 0, yPercent: 50 }, "t")).toHaveLength(1);
    expect(validateCaptionLayout({ xPercent: 50, yPercent: 50 }, "t")).toHaveLength(0);
  });
});
