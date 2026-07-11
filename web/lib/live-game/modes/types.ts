import type { Rect } from "@/lib/teststartpage/chase-game-physics";
import type { GrassTileId } from "@/lib/live-game/tiles/grass-tile-pack";

export type LiveGameModeId = "english_craft";

export type LiveGameModeConfig = {
  id: LiveGameModeId;
  title: string;
  subtitle: string;
  defaultDurationMinutes: number;
  defaultMapId: string;
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
