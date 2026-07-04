import type { BoardPathStyle } from "@/lib/board-game/types";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const BOARD_LENGTHS: Record<BoardPathStyle, number> = {
  short: 12,
  medium: 20,
  long: 30,
};

export const BOARD_PATH_LABELS: Record<BoardPathStyle, string> = {
  short: "Short path (12 spaces)",
  medium: "Medium path (20 spaces)",
  long: "Long path (30 spaces)",
};

export const PAWN_COLORS = [
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "green", label: "Green", hex: "#22c55e" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "purple", label: "Purple", hex: "#a855f7" },
  { id: "orange", label: "Orange", hex: "#f97316" },
] as const;

export const SETUP_STORAGE_KEY = "wke-board-game-setup-v1";
export const RUNTIME_STORAGE_KEY = "wke-board-game-runtime-v1";
export const MAPS_STORAGE_KEY = "wke-board-game-maps-v1";

export function boardLengthForStyle(style: BoardPathStyle): number {
  return BOARD_LENGTHS[style];
}
