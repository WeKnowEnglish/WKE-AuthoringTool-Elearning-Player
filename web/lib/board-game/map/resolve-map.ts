import type { BoardPathStyle, GameSetup } from "@/lib/board-game/types";
import { getDefaultMapForPathStyle, getMapById, defaultMapIdForPathStyle } from "@/lib/board-game/map/default-maps";
import { boardLengthFromMap } from "@/lib/board-game/map/map-to-runtime";
import type { BoardMap } from "@/lib/board-game/map/types";

/**
 * Resolve the active board map for a game setup.
 * Priority: embedded map → mapId lookup → legacy boardPathStyle default.
 */
export function resolveMapForSetup(setup: GameSetup): BoardMap {
  if (setup.map?.schemaVersion === 1) {
    return setup.map;
  }
  if (setup.mapId) {
    const found = getMapById(setup.mapId);
    if (found) return found;
  }
  return getDefaultMapForPathStyle(setup.boardPathStyle);
}

export function defaultMapIdForSetup(setup: GameSetup): string {
  if (setup.mapId) return setup.mapId;
  return defaultMapIdForPathStyle(setup.boardPathStyle);
}

export function boardLengthForSetup(setup: GameSetup): number {
  return boardLengthFromMap(resolveMapForSetup(setup));
}

export function getMapTitleForSetup(setup: GameSetup): string {
  return resolveMapForSetup(setup).title;
}

export function formatMapMeta(map: BoardMap): string {
  const spaces = map.pathOrder.length - 1;
  return `${spaces} spaces · ${map.layoutTemplate} · ${map.theme}`;
}

export function resolveMapForPathStyle(style: BoardPathStyle): BoardMap {
  return getDefaultMapForPathStyle(style);
}
