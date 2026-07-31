import { describe, expect, it } from "vitest";
import {
  getLiveGameModule,
  getMapForMode,
  isLiveGameModeId,
  listAvailableLiveGameModules,
  listLiveGameModules,
} from "@/lib/live-game/modes";

describe("live game module registry", () => {
  it("keeps English Craft available with its existing map", () => {
    const gameModule = getLiveGameModule("english_craft");

    expect(gameModule.status).toBe("available");
    expect(getMapForMode(gameModule.config.defaultMapId, gameModule.id).id).toBe("english-craft-v1");
  });

  it("registers Bug Market as an available live-game module", () => {
    const gameModule = getLiveGameModule("bug_market");

    expect(gameModule.status).toBe("available");
    expect(gameModule.maps.map((map) => map.id)).toEqual(["bug-market-v1"]);
    expect(listAvailableLiveGameModules().map((item) => item.id)).toEqual([
      "english_craft",
      "bug_market",
    ]);
  });

  it("recognizes only registered mode ids", () => {
    expect(isLiveGameModeId("english_craft")).toBe(true);
    expect(isLiveGameModeId("bug_market")).toBe(true);
    expect(isLiveGameModeId("reef_repair")).toBe(false);
    expect(listLiveGameModules()).toHaveLength(2);
  });
});
