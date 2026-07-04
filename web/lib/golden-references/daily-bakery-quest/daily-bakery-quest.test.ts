import { describe, expect, it } from "vitest";
import { getExploreScene, isScenePlayable } from "@/lib/explore/scenes";
import { BAKERY_RECIPE_RESCUE_SCENE } from "@/lib/explore/scenes/bakery-recipe-rescue";
import {
  assertDailyBakeryGoldenReferenceValid,
  dailyBakeryScreensForPhase,
  getDailyBakeryLessonPlan,
  getDailyBakeryScreens,
  validateDailyBakeryScreens,
} from "./index";

describe("Daily Bakery Quest golden reference", () => {
  it("validates lesson plan blueprint and all screens", () => {
    expect(() => assertDailyBakeryGoldenReferenceValid()).not.toThrow();
  });

  it("has ten player screens in phase order", () => {
    const screens = getDailyBakeryScreens();
    expect(screens).toHaveLength(10);
    expect(screens[0]?.screen_type).toBe("start");
    expect(screens[1]?.screen_type).toBe("story");
    expect(validateDailyBakeryScreens()).toHaveLength(0);
  });

  it("maps learning loop phases to screen slices", () => {
    const plan = getDailyBakeryLessonPlan();
    expect(plan.learningLoop.loopId).toBe("daily-bakery-quest");
    expect(plan.learningLoop.phases).toHaveLength(4);

    expect(dailyBakeryScreensForPhase("STORY").map((s) => s.screen_type)).toEqual([
      "start",
      "story",
    ]);
    expect(dailyBakeryScreensForPhase("PRESENTATION")).toHaveLength(6);
    expect(dailyBakeryScreensForPhase("REFLECTION")).toHaveLength(2);
    expect(dailyBakeryScreensForPhase("EXPLORER")).toHaveLength(0);

    expect(plan.phaseContentMap.EXPLORER.exploreSceneId).toBe("bakery_recipe_rescue");
  });

  it("registers a playable bakery explore scene with four pickups", () => {
    const scene = getExploreScene("bakery_recipe_rescue");
    expect(scene.id).toBe(BAKERY_RECIPE_RESCUE_SCENE.id);
    expect(scene.wordPickups).toHaveLength(4);
    expect(isScenePlayable("bakery_recipe_rescue")).toBe(true);
    expect(scene.cloze.sentences).toHaveLength(2);
  });
});
