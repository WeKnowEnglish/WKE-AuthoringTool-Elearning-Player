import { describe, expect, it } from "vitest";
import { HOME_HELP_BROTHER_SCENE } from "@/lib/explore/scenes/home-help-brother";
import {
  collectMaterialPickup,
  collectWordPickup,
  createExploreSceneState,
  findInteractTarget,
  isChecklistComplete,
  resolveCurrentZone,
  tickExploreSceneMovement,
} from "./explore-scene-engine";

const SCENE = HOME_HELP_BROTHER_SCENE;

describe("explore-scene-engine", () => {
  it("creates player near brother inside map bounds", () => {
    const state = createExploreSceneState(SCENE);
    expect(state.playerX).toBeGreaterThanOrEqual(0);
    expect(state.playerY).toBeGreaterThanOrEqual(0);
    expect(state.playerX + 32).toBeLessThanOrEqual(SCENE.map.widthPx);
    expect(state.collectedWordIds).toEqual([]);
  });

  it("resolves zone from player center", () => {
    const state = createExploreSceneState(SCENE);
    const zone = resolveCurrentZone(SCENE, state.playerX, state.playerY);
    expect(zone).toBe("living_room");
  });

  it("blocks movement into collision rects", () => {
    let state = createExploreSceneState(SCENE);
    const startX = state.playerX;
    for (let i = 0; i < 120; i++) {
      state = tickExploreSceneMovement(SCENE, state, {
        axisX: -1,
        axisY: 0,
        dtSec: 1 / 60,
      });
    }
    expect(state.playerX).toBeGreaterThanOrEqual(0);
    expect(state.playerX).toBeLessThanOrEqual(startX);
  });

  it("completes checklist only when all words and materials collected", () => {
    let state = createExploreSceneState(SCENE);
    expect(isChecklistComplete(SCENE, state)).toBe(false);

    for (const p of SCENE.wordPickups) {
      state = collectWordPickup(state, p.pickupId, p.wordId);
    }
    expect(isChecklistComplete(SCENE, state)).toBe(false);

    for (const p of SCENE.materialPickups) {
      state = collectMaterialPickup(state, p.pickupId, p.materialId);
    }
    expect(isChecklistComplete(SCENE, state)).toBe(true);
  });

  it("finds nearest word pickup in range", () => {
    const pickup = SCENE.wordPickups.find((p) => p.pickupId === "pickup_rug")!;
    const state = {
      ...createExploreSceneState(SCENE),
      playerX: pickup.x - 16,
      playerY: pickup.y - 16,
    };
    const target = findInteractTarget(SCENE, state);
    expect(target?.kind).toBe("word");
    if (target?.kind === "word") {
      expect(target.pickupId).toBe("pickup_rug");
    }
  });

  it("does not offer brother until checklist complete", () => {
    let state = createExploreSceneState(SCENE);
    state = {
      ...state,
      playerX: SCENE.brother.x,
      playerY: SCENE.brother.y,
    };
    expect(findInteractTarget(SCENE, state)).toBeNull();

    for (const p of SCENE.wordPickups) {
      state = collectWordPickup(state, p.pickupId, p.wordId);
    }
    for (const p of SCENE.materialPickups) {
      state = collectMaterialPickup(state, p.pickupId, p.materialId);
    }
    const target = findInteractTarget(SCENE, state);
    expect(target?.kind).toBe("brother");
  });

  it("can walk south into kitchen through horizontal doorway", () => {
    let state = createExploreSceneState(SCENE);
    for (let i = 0; i < 240; i++) {
      state = tickExploreSceneMovement(SCENE, state, {
        axisX: 0,
        axisY: 1,
        dtSec: 1 / 60,
      });
    }
    expect(resolveCurrentZone(SCENE, state.playerX, state.playerY)).toBe("kitchen");
  });

  it("can walk east into bedroom through vertical doorway", () => {
    let state = createExploreSceneState(SCENE);
    for (let i = 0; i < 500; i++) {
      state = tickExploreSceneMovement(SCENE, state, {
        axisX: 1,
        axisY: 0,
        dtSec: 1 / 60,
      });
    }
    expect(resolveCurrentZone(SCENE, state.playerX, state.playerY)).toBe("bedroom");
    expect(state.playerX).toBeGreaterThan(460);
  });

  it("hides collected pickups from interact targets", () => {
    const pickup = SCENE.wordPickups[0]!;
    let state = {
      ...createExploreSceneState(SCENE),
      playerX: pickup.x,
      playerY: pickup.y,
    };
    state = collectWordPickup(state, pickup.pickupId, pickup.wordId);
    const target = findInteractTarget(SCENE, state);
    if (target?.kind === "word") {
      expect(target.pickupId).not.toBe(pickup.pickupId);
    }
  });
});
