import { describe, expect, it } from "vitest";
import { missingAcRemoteMystery } from "@/content/mysteries/missing-ac-remote";
import { mysteryConditionsMet } from "@/lib/mystery/conditions";
import { getMysteryDefinitionIssues } from "@/lib/mystery/definition";
import {
  createInitialMysteryState,
  mysteryStateReducer,
} from "@/lib/mystery/state";
import { normalizeMysteryState } from "@/lib/mystery/storage";

describe("mystery engine", () => {
  it("creates independent runtime state from static content", () => {
    const state = createInitialMysteryState(missingAcRemoteMystery);

    expect(state.mysteryId).toBe("missing-ac-remote");
    expect(state.currentSceneId).toBe("classroom");
    expect(state.discoveredClueIds).toEqual([]);
    expect(missingAcRemoteMystery.clues).toHaveLength(5);
  });

  it("collects evidence and records hotspot inspection only once", () => {
    const hotspot = missingAcRemoteMystery.scenes[0].hotspots.find(
      (candidate) => candidate.id === "trash-bin",
    );
    expect(hotspot).toBeDefined();
    if (!hotspot) return;

    let state = createInitialMysteryState(missingAcRemoteMystery);
    state = mysteryStateReducer(missingAcRemoteMystery, state, {
      type: "hotspot_activated",
      hotspotId: hotspot.id,
      action: hotspot.action,
    });
    state = mysteryStateReducer(missingAcRemoteMystery, state, {
      type: "hotspot_activated",
      hotspotId: hotspot.id,
      action: hotspot.action,
    });

    expect(state.inspectedHotspotIds).toEqual(["trash-bin"]);
    expect(state.discoveredClueIds).toEqual(["dead-batteries"]);
  });

  it("evaluates Phase 2-ready conditions against the same player state", () => {
    const state = {
      ...createInitialMysteryState(missingAcRemoteMystery),
      discoveredClueIds: ["dead-batteries", "moved-chair"],
      askedQuestionIds: ["mia-chair"],
    };

    expect(
      mysteryConditionsMet(
        [
          { type: "clue_count", minimum: 2 },
          { type: "question_asked", questionId: "mia-chair" },
        ],
        state,
      ),
    ).toBe(true);
    expect(
      mysteryConditionsMet(
        [{ type: "clue_discovered", clueId: "empty-holder" }],
        state,
      ),
    ).toBe(false);
  });

  it("drops stale or unknown local progress safely", () => {
    const normalized = normalizeMysteryState(
      {
        ...createInitialMysteryState(missingAcRemoteMystery),
        discoveredClueIds: ["dead-batteries", "not-a-real-clue"],
        inspectedHotspotIds: ["trash-bin", "not-a-real-hotspot"],
        currentSceneId: "missing-scene",
      },
      missingAcRemoteMystery,
    );

    expect(normalized?.discoveredClueIds).toEqual(["dead-batteries"]);
    expect(normalized?.inspectedHotspotIds).toEqual(["trash-bin"]);
    expect(normalized?.currentSceneId).toBe("classroom");
  });

  it("ships valid cross-references and percentage bounds", () => {
    expect(getMysteryDefinitionIssues(missingAcRemoteMystery)).toEqual([]);
  });
});
