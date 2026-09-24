import type {
  MysteryDefinition,
  MysteryHotspotAction,
  MysteryPlayerState,
} from "@/lib/mystery/types";

export type MysteryRuntimeAction =
  | { type: "hydrate"; state: MysteryPlayerState }
  | { type: "start" }
  | {
      type: "hotspot_activated";
      hotspotId: string;
      action: MysteryHotspotAction;
    }
  | { type: "ask_question"; questionId: string }
  | { type: "solve" }
  | { type: "reset" };

function appendUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

export function createInitialMysteryState(
  definition: MysteryDefinition,
): MysteryPlayerState {
  return {
    schemaVersion: 1,
    mysteryId: definition.id,
    contentVersion: definition.contentVersion,
    phase: "intro",
    currentSceneId: definition.initialSceneId,
    discoveredClueIds: [],
    inspectedHotspotIds: [],
    openedCharacterIds: [],
    askedQuestionIds: [],
    triggeredEventIds: [],
    visitedSceneIds: [],
    accusationAttempts: 0,
    solved: false,
  };
}

export function mysteryStateReducer(
  definition: MysteryDefinition,
  state: MysteryPlayerState,
  runtimeAction: MysteryRuntimeAction,
): MysteryPlayerState {
  switch (runtimeAction.type) {
    case "hydrate":
      return runtimeAction.state;
    case "start":
      return {
        ...state,
        phase: "investigation",
        visitedSceneIds: appendUnique(state.visitedSceneIds, state.currentSceneId),
      };
    case "ask_question":
      return {
        ...state,
        askedQuestionIds: appendUnique(
          state.askedQuestionIds,
          runtimeAction.questionId,
        ),
      };
    case "solve":
      return { ...state, phase: "solved", solved: true };
    case "reset":
      return createInitialMysteryState(definition);
    case "hotspot_activated": {
      const action = runtimeAction.action;
      const next: MysteryPlayerState = {
        ...state,
        inspectedHotspotIds: appendUnique(
          state.inspectedHotspotIds,
          runtimeAction.hotspotId,
        ),
      };

      switch (action.type) {
        case "discover_clue":
          return {
            ...next,
            discoveredClueIds: appendUnique(next.discoveredClueIds, action.clueId),
          };
        case "change_scene":
          return {
            ...next,
            currentSceneId: action.sceneId,
            visitedSceneIds: appendUnique(next.visitedSceneIds, action.sceneId),
          };
        case "open_character":
          return {
            ...next,
            openedCharacterIds: appendUnique(
              next.openedCharacterIds,
              action.characterId,
            ),
          };
        case "trigger_event":
          return {
            ...next,
            triggeredEventIds: appendUnique(
              next.triggeredEventIds,
              action.eventId,
            ),
          };
        case "inspect":
          return next;
      }
    }
  }
}
