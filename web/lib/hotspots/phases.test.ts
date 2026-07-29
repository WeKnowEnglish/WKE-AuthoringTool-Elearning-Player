import { describe, expect, it } from "vitest";
import { HOBBIES_HOTSPOT_ACTIVITY } from "./fixtures/hobbiesHotspot";
import {
  duplicateImageAsset,
  duplicatePhaseInDocument,
  ensurePhases,
  forkPhaseImageAsset,
  hotspotsForPhase,
  movePhase,
  nextPhaseImageAssetId,
  phasesUsingAsset,
  withEnsuredPhases,
} from "./phases";

describe("hotspot phase image assets", () => {
  it("gives each new scene its own duplicated image asset", () => {
    const withPhases = withEnsuredPhases(HOBBIES_HOTSPOT_ACTIVITY);
    const scene1Asset = ensurePhases(withPhases)[0]!.imageAssetId;
    const newAssetId = nextPhaseImageAssetId(withPhases);
    const withAsset = duplicateImageAsset(withPhases, scene1Asset, newAssetId);
    const next = {
      ...withAsset,
      interaction: {
        ...withAsset.interaction,
        phases: [
          ...ensurePhases(withAsset),
          {
            id: "phase-2",
            title: "Scene 2",
            imageAssetId: newAssetId,
            hotspotIds: [],
          },
        ],
      },
    };
    const phases = ensurePhases(next);
    expect(phases).toHaveLength(2);
    expect(phases[0]?.imageAssetId).not.toBe(phases[1]?.imageAssetId);
    expect(next.assets.some((asset) => asset.id === newAssetId)).toBe(true);
  });

  it("forks a shared asset when replacing image for one scene", () => {
    const withPhases = withEnsuredPhases(HOBBIES_HOTSPOT_ACTIVITY);
    const sharedAsset = ensurePhases(withPhases)[0]!.imageAssetId;
    const bothShare = {
      ...withPhases,
      interaction: {
        ...withPhases.interaction,
        phases: [
          { id: "phase-1", title: "Scene 1", imageAssetId: sharedAsset, hotspotIds: [] },
          { id: "phase-2", title: "Scene 2", imageAssetId: sharedAsset, hotspotIds: [] },
        ],
      },
    };
    expect(phasesUsingAsset(ensurePhases(bothShare), sharedAsset)).toBe(2);

    const forked = forkPhaseImageAsset(bothShare, "phase-2");
    const phases = ensurePhases(forked);
    expect(phases[0]?.imageAssetId).toBe(sharedAsset);
    expect(phases[1]?.imageAssetId).not.toBe(sharedAsset);
    expect(forked.assets.length).toBe(bothShare.assets.length + 1);
  });

  it("reorders phases left and right without losing entries", () => {
    const phases = [
      { id: "a", title: "A", imageAssetId: "img", hotspotIds: [] },
      { id: "b", title: "B", imageAssetId: "img", hotspotIds: [] },
      { id: "c", title: "C", imageAssetId: "img", hotspotIds: [] },
    ];
    expect(movePhase(phases, "b", -1).map((phase) => phase.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(movePhase(phases, "b", 1).map((phase) => phase.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(movePhase(phases, "a", -1)).toBe(phases);
    expect(movePhase(phases, "c", 1)).toBe(phases);
  });

  it("duplicates a scene with its own image, objects, and dialogues", () => {
    const withPhases = withEnsuredPhases(HOBBIES_HOTSPOT_ACTIVITY);
    const source = ensurePhases(withPhases)[0]!;
    const sourceHotspotCount = source.hotspotIds.length;
    const sourceDialogueCount = withPhases.interaction.dialogues.filter((dialogue) =>
      source.hotspotIds.includes(dialogue.hotspotId),
    ).length;

    const result = duplicatePhaseInDocument(withPhases, source.id);
    expect(result).not.toBeNull();
    const { document: next, newPhaseId } = result!;
    const phases = ensurePhases(next);
    expect(phases).toHaveLength(2);
    expect(phases[1]?.id).toBe(newPhaseId);
    expect(phases[1]?.imageAssetId).not.toBe(source.imageAssetId);
    expect(phases[1]?.hotspotIds).toHaveLength(sourceHotspotCount);
    expect(
      phases[1]?.hotspotIds.every((id) => !source.hotspotIds.includes(id)),
    ).toBe(true);
    expect(hotspotsForPhase(next, newPhaseId)).toHaveLength(sourceHotspotCount);
    expect(
      next.interaction.dialogues.filter((dialogue) =>
        phases[1]!.hotspotIds.includes(dialogue.hotspotId),
      ),
    ).toHaveLength(sourceDialogueCount);
  });
});
