import type { Rect } from "@/lib/teststartpage/chase-game-physics";
import type { GrassTileId } from "@/lib/live-game/tiles/grass-tile-pack";

export type LiveGameModeId = "english_craft" | "bug_market";

export type LiveGameModeConfig = {
  id: LiveGameModeId;
  title: string;
  subtitle: string;
  defaultDurationMinutes: number;
  defaultMapId: string;
};

export type LiveGameModuleStatus = "available" | "foundation";

/**
 * Client-safe contract registered by every live game.
 *
 * Gameplay state, server commands, and React renderers stay in the game module;
 * this manifest only exposes the platform metadata needed before a room starts.
 */
export type LiveGameModuleDefinition = {
  id: LiveGameModeId;
  version: number;
  status: LiveGameModuleStatus;
  config: LiveGameModeConfig;
  maps: readonly LiveGameMapDef[];
};

export type LiveGameSpawnPoint = {
  id: string;
  x: number;
  y: number;
};

export type LiveGameTilemapDef = {
  cols: number;
  rows: number;
  tileSizePx: number;
  /** null = water / empty cell */
  cells: (GrassTileId | null)[][];
};

export type LiveGameMapDef = {
  id: string;
  modeId: LiveGameModeId;
  widthPx: number;
  heightPx: number;
  /** Fallback when tilemap is absent */
  backgroundUrl?: string;
  tilemap?: LiveGameTilemapDef;
  collisionRects: Rect[];
  spawnPoints: LiveGameSpawnPoint[];
};
