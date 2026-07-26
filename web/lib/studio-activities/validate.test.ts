import { describe, expect, it } from "vitest";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import hobbiesHotspots from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import { playPathForStudioActivity, bankPathForStudioActivity } from "./paths";
import {
  isStudioActivityFormat,
  normalizeStudioActivityTitle,
  validateStudioActivityPack,
} from "./validate";

describe("studio-activities validate", () => {
  it("accepts known formats only", () => {
    expect(isStudioActivityFormat("multiple_choice")).toBe(true);
    expect(isStudioActivityFormat("vocabulary_list")).toBe(true);
    expect(isStudioActivityFormat("explore_hotspots")).toBe(true);
    expect(isStudioActivityFormat("listen_and_choose")).toBe(false);
  });

  it("validates explore_hotspots authoring into a play payload pack", () => {
    const result = validateStudioActivityPack(
      "explore_hotspots",
      null,
      hobbiesHotspots,
    );
    expect(result.defaultTitle).toBeTruthy();
    expect(result.pack.subtype).toBe("explore_hotspots");
    expect(result.authoring).toMatchObject({ kind: "activity-authoring" });
  });

  it("validates vocabulary list authoring into a stub pack", () => {
    const result = validateStudioActivityPack("vocabulary_list", null, {
      version: 1,
      kind: "vocabulary-list",
      id: "vocab-test",
      name: "Test list",
      entries: [{ id: "v1", word: "hello" }],
    });
    expect(result.defaultTitle).toBe("Test list");
    expect(result.pack.kind).toBe("vocabulary-list-pack");
    expect(result.authoring).toMatchObject({ name: "Test list" });
  });

  it("normalizes titles", () => {
    expect(normalizeStudioActivityTitle("  Hello  ")).toBe("Hello");
    expect(() => normalizeStudioActivityTitle("")).toThrow(/required/);
  });

  it("validates MCQ packs and derives title", () => {
    const result = validateStudioActivityPack("multiple_choice", bakeryQuickCheck);
    expect(result.defaultTitle).toBeTruthy();
    expect(result.pack.format).toBe("multiple_choice");
  });

  it("rejects authoring docs disguised as packs", () => {
    expect(() =>
      validateStudioActivityPack("multiple_choice", {
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "game", format: "multiple_choice" },
      }),
    ).toThrow(/lessonplayer-games-pack|Export for Lesson Player/);
  });
});

describe("studio-activities paths", () => {
  it("builds play and bank paths", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(playPathForStudioActivity("multiple_choice", id)).toContain(
      `activity=${encodeURIComponent(id)}`,
    );
    expect(playPathForStudioActivity("explore_hotspots", id)).toBe(
      `/teacher/activity-builder/hotspots?activity=${encodeURIComponent(id)}`,
    );
    expect(bankPathForStudioActivity(id)).toBe(
      `/teacher/classes?bank=1&activity=${encodeURIComponent(id)}`,
    );
  });
});
