import { createInitialMysteryState } from "@/lib/mystery/state";
import type {
  MysteryDefinition,
  MysteryPlayerPhase,
  MysteryPlayerState,
} from "@/lib/mystery/types";

const STORAGE_NAMESPACE = "wke:mystery-progress:v1";

export function mysteryStorageKey(mysteryId: string): string {
  return STORAGE_NAMESPACE + ":" + mysteryId;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function validPhase(value: unknown): value is MysteryPlayerPhase {
  return value === "intro" || value === "investigation" || value === "solved";
}

export function normalizeMysteryState(
  raw: unknown,
  definition: MysteryDefinition,
): MysteryPlayerState | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<MysteryPlayerState>;
  if (record.schemaVersion !== 1 || record.mysteryId !== definition.id) return null;
  if (record.contentVersion !== definition.contentVersion) return null;

  const sceneIds = new Set(definition.scenes.map((scene) => scene.id));
  const hotspotIds = new Set(
    definition.scenes.flatMap((scene) => scene.hotspots.map((spot) => spot.id)),
  );
  const clueIds = new Set(definition.clues.map((clue) => clue.id));
  const characterIds = new Set(
    (definition.characters ?? []).map((character) => character.id),
  );
  const questionIds = new Set(
    (definition.characters ?? []).flatMap((character) =>
      character.questions.map((question) => question.id),
    ),
  );
  const eventIds = new Set((definition.events ?? []).map((event) => event.id));
  const phase = validPhase(record.phase) ? record.phase : "intro";
  const solved = record.solved === true || phase === "solved";

  return {
    ...createInitialMysteryState(definition),
    phase: solved ? "solved" : phase,
    currentSceneId:
      typeof record.currentSceneId === "string" &&
      sceneIds.has(record.currentSceneId)
        ? record.currentSceneId
        : definition.initialSceneId,
    discoveredClueIds: stringArray(record.discoveredClueIds).filter((id) =>
      clueIds.has(id),
    ),
    inspectedHotspotIds: stringArray(record.inspectedHotspotIds).filter((id) =>
      hotspotIds.has(id),
    ),
    openedCharacterIds: stringArray(record.openedCharacterIds).filter((id) =>
      characterIds.has(id),
    ),
    askedQuestionIds: stringArray(record.askedQuestionIds).filter((id) =>
      questionIds.has(id),
    ),
    triggeredEventIds: stringArray(record.triggeredEventIds).filter((id) =>
      eventIds.has(id),
    ),
    visitedSceneIds: stringArray(record.visitedSceneIds).filter((id) =>
      sceneIds.has(id),
    ),
    accusationAttempts:
      typeof record.accusationAttempts === "number" &&
      record.accusationAttempts >= 0
        ? Math.floor(record.accusationAttempts)
        : 0,
    solved,
  };
}

export function readStoredMysteryState(
  definition: MysteryDefinition,
): MysteryPlayerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(mysteryStorageKey(definition.id));
    return raw ? normalizeMysteryState(JSON.parse(raw), definition) : null;
  } catch {
    return null;
  }
}

export function writeStoredMysteryState(state: MysteryPlayerState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      mysteryStorageKey(state.mysteryId),
      JSON.stringify(state),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearStoredMysteryState(mysteryId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(mysteryStorageKey(mysteryId));
  } catch {
    // Privacy settings may disable storage. In-memory reset still works.
  }
}
