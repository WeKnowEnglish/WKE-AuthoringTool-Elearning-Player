import type { MysteryCondition, MysteryPlayerState } from "@/lib/mystery/types";

export function mysteryConditionMet(
  condition: MysteryCondition,
  state: MysteryPlayerState,
): boolean {
  switch (condition.type) {
    case "clue_discovered":
      return state.discoveredClueIds.includes(condition.clueId);
    case "hotspot_inspected":
      return state.inspectedHotspotIds.includes(condition.hotspotId);
    case "question_asked":
      return state.askedQuestionIds.includes(condition.questionId);
    case "event_triggered":
      return state.triggeredEventIds.includes(condition.eventId);
    case "scene_visited":
      return state.visitedSceneIds.includes(condition.sceneId);
    case "clue_count":
      return state.discoveredClueIds.length >= condition.minimum;
  }
}

export function mysteryConditionsMet(
  conditions: MysteryCondition[] | undefined,
  state: MysteryPlayerState,
): boolean {
  return (
    !conditions?.length ||
    conditions.every((condition) => mysteryConditionMet(condition, state))
  );
}
