import { describe, expect, it } from "vitest";
import { getExploreArea } from "@/lib/explore/areas";
import { buildExploreWordPool } from "@/lib/explore/explore-word-pool";
import { getExploreAreaEncounterWordPool } from "@/lib/explore/area-discovery";
import { lookupWordIdFromLemma } from "@/lib/word-collection";
import {
  EXPLORE_CHAPTER_IDS,
  getExploreChapter,
  getExploreChapterForArea,
  listExploreChapters,
} from "./index";

describe("explore chapters", () => {
  it("registers three place-themed chapters", () => {
    const chapters = listExploreChapters();
    expect(chapters.map((c) => c.id)).toEqual([...EXPLORE_CHAPTER_IDS]);
    expect(chapters[0]?.areaId).toBe("bedroom");
  });

  it("links each runner chapter to an explore area", () => {
    for (const id of EXPLORE_CHAPTER_IDS) {
      const chapter = getExploreChapter(id);
      const area = getExploreArea(chapter.areaId);
      if (area.playMode === "scene") continue;
      expect(getExploreChapterForArea(chapter.areaId).id).toBe(chapter.id);
      expect(area.chapterId).toBe(chapter.id);
    }
  });

  it("bedroom gates use bed, desk, closet", () => {
    const gates = getExploreChapter("bedroom").payload.gates;
    expect(gates.map((g) => g.target_word)).toEqual(["bed", "desk", "closet"]);
  });

  it("gate lemmas resolve to master vocabulary", () => {
    for (const chapter of listExploreChapters()) {
      for (const gate of chapter.payload.gates) {
        expect(lookupWordIdFromLemma(gate.target_word)).toBeTruthy();
      }
    }
  });

  it("area encounter pool is larger than gate-only pool", () => {
    const chapter = getExploreChapter("bedroom");
    const gatePool = buildExploreWordPool(chapter.payload.gates);
    const areaPool = getExploreAreaEncounterWordPool("bedroom");
    expect(areaPool.length).toBeGreaterThan(gatePool.length);
    expect(gatePool.every((id) => areaPool.includes(id))).toBe(true);
  });
});
