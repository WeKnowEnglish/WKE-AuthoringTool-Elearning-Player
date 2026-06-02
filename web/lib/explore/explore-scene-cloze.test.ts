import { describe, expect, it } from "vitest";
import { HOME_HELP_BROTHER_SCENE } from "@/lib/explore/scenes/home-help-brother";
import { buildExploreSceneClozePayload } from "./explore-scene-cloze";

describe("buildExploreSceneClozePayload", () => {
  it("merges sentences into one template with unique blank ids", () => {
    const payload = buildExploreSceneClozePayload(
      HOME_HELP_BROTHER_SCENE,
      ["desk", "bed", "lamp", "rug", "window", "closet"],
      "test-seed",
    );
    expect(payload.blanks).toHaveLength(3);
    expect(payload.template).toContain("__1__");
    expect(payload.template).toContain("__2__");
    expect(payload.template).toContain("__3__");
    expect(payload.word_bank).toContain("desk");
    expect(payload.word_bank).toContain("bed");
  });
});
