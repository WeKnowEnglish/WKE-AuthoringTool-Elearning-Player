import { describe, expect, it } from "vitest";
import { getExploreArea } from "@/lib/explore/areas";
import {
  getExploreScene,
  getExploreSceneForArea,
  getNextSceneId,
  isScenePlayable,
  isSceneUnlocked,
  listExploreScenes,
} from "./index";
import { HOME_HELP_BROTHER_SCENE } from "./home-help-brother";

describe("explore scenes", () => {
  it("registers home_help_brother with placeholder map", () => {
    const scene = getExploreScene("home_help_brother");
    expect(scene.map.widthPx).toBe(960);
    expect(scene.map.heightPx).toBe(540);
    expect(scene.map.collisionRects.length).toBeGreaterThan(0);
    expect(scene.map.backgroundUrl).toContain("placehold.co");
  });

  it("links bedroom area to scene mode", () => {
    const area = getExploreArea("bedroom");
    expect(area.playMode).toBe("scene");
    expect(area.sceneId).toBe("home_help_brother");
    expect(area.chapterId).toBeUndefined();
    expect(getExploreSceneForArea("bedroom").id).toBe("home_help_brother");
  });

  it("word pickups cover all discovery words", () => {
    const area = getExploreArea("bedroom");
    const scene = HOME_HELP_BROTHER_SCENE;
    const pickupWordIds = scene.wordPickups.map((p) => p.wordId);
    for (const id of area.discoveryWordIds) {
      expect(pickupWordIds).toContain(id);
    }
    expect(pickupWordIds).toHaveLength(area.discoveryWordIds.length);
  });

  it("has three zones, doorways, and material pickups", () => {
    expect(HOME_HELP_BROTHER_SCENE.zones.map((z) => z.id)).toEqual([
      "living_room",
      "kitchen",
      "bedroom",
    ]);
    expect(HOME_HELP_BROTHER_SCENE.map.doorways?.length).toBeGreaterThanOrEqual(2);
    expect(HOME_HELP_BROTHER_SCENE.materialPickups).toHaveLength(2);
    expect(
      HOME_HELP_BROTHER_SCENE.wordPickups.some((p) => p.zone === "kitchen"),
    ).toBe(true);
  });

  it("next scene is locked stub", () => {
    expect(getNextSceneId("home_help_brother")).toBe("school_help_brother");
    expect(isScenePlayable("school_help_brother")).toBe(false);
    expect(isSceneUnlocked("school_help_brother")).toBe(false);
  });

  it("lists scenes in order", () => {
    const ids = listExploreScenes().map((s) => s.id);
    expect(ids[0]).toBe("home_help_brother");
    expect(ids[1]).toBe("school_help_brother");
    expect(ids[2]).toBe("bakery_recipe_rescue");
  });

  it("registers bakery_recipe_rescue with four ingredient pickups", () => {
    const scene = getExploreScene("bakery_recipe_rescue");
    expect(scene.wordPickups.map((p) => p.wordId).sort()).toEqual([
      "bread",
      "egg",
      "jam",
      "milk",
    ]);
    expect(isScenePlayable("bakery_recipe_rescue")).toBe(true);
  });
});
