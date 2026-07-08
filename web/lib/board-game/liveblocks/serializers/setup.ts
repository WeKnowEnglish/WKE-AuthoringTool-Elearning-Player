import { LiveObject } from "@liveblocks/client";
import { normalizeSetup } from "@/lib/board-game/storage";
import type { GameSetup } from "@/lib/board-game/types";

function readSetupFromLiveObject(live: LiveObject<GameSetup>): GameSetup {
  return {
    schemaVersion: live.get("schemaVersion"),
    playerCount: live.get("playerCount"),
    players: [...live.get("players")],
    boardPathStyle: live.get("boardPathStyle"),
    questions: [...live.get("questions")],
    enableLuckySpaces: live.get("enableLuckySpaces"),
    enablePenalties: live.get("enablePenalties"),
    mapId: live.get("mapId"),
    map: live.get("map"),
  };
}

export function gameSetupFromStorage(value: unknown): GameSetup | null {
  if (!value) return null;
  if (value instanceof LiveObject) {
    return normalizeSetup(readSetupFromLiveObject(value)) ?? null;
  }
  return normalizeSetup(value as GameSetup) ?? null;
}

export function cloneGameSetup(setup: GameSetup): GameSetup {
  return JSON.parse(JSON.stringify(setup)) as GameSetup;
}

export function applyGameSetupToLiveObject(
  live: LiveObject<GameSetup>,
  setup: GameSetup,
): void {
  live.set("schemaVersion", setup.schemaVersion);
  live.set("playerCount", setup.playerCount);
  live.set("players", [...setup.players]);
  live.set("boardPathStyle", setup.boardPathStyle);
  live.set("questions", [...setup.questions]);
  live.set("enableLuckySpaces", setup.enableLuckySpaces);
  live.set("enablePenalties", setup.enablePenalties);
  live.set("mapId", setup.mapId);
  live.set("map", setup.map);
}
