import type { MapThemeId } from "@/lib/board-game/map/types";

export type BoardThemeId = MapThemeId;

const baseTile = {
  tileShadow: "shadow-[3px_3px_0_0_var(--kid-shadow)]",
  tileRadius: "rounded-2xl",
} as const;

export const BOARD_THEME = {
  classroom: {
    id: "classroom" as const,
    boardBg: "linear-gradient(180deg, #dbeafe 0%, #fef3c7 100%)",
    pathTile: "bg-gradient-to-br from-amber-100 to-amber-200",
    grassTile: "bg-gradient-to-br from-sky-100 to-blue-100",
    startTile: "bg-gradient-to-br from-green-200 to-green-300",
    finishTile: "bg-gradient-to-br from-yellow-200 to-orange-300",
    ...baseTile,
  },
  jungle: {
    id: "jungle" as const,
    boardBg: "linear-gradient(180deg, #14532d22 0%, #84cc1633 100%)",
    pathTile: "bg-gradient-to-br from-lime-100 to-green-200",
    grassTile: "bg-gradient-to-br from-emerald-100 to-teal-200",
    startTile: "bg-gradient-to-br from-green-300 to-emerald-400",
    finishTile: "bg-gradient-to-br from-amber-200 to-yellow-400",
    ...baseTile,
  },
  space: {
    id: "space" as const,
    boardBg: "linear-gradient(180deg, #1e1b4b 0%, #312e8133 100%)",
    pathTile: "bg-gradient-to-br from-indigo-200 to-violet-300",
    grassTile: "bg-gradient-to-br from-purple-100 to-indigo-200",
    startTile: "bg-gradient-to-br from-cyan-200 to-blue-300",
    finishTile: "bg-gradient-to-br from-fuchsia-200 to-pink-300",
    ...baseTile,
  },
  ocean: {
    id: "ocean" as const,
    boardBg: "linear-gradient(180deg, #0ea5e933 0%, #06b6d433 100%)",
    pathTile: "bg-gradient-to-br from-sky-100 to-cyan-200",
    grassTile: "bg-gradient-to-br from-teal-100 to-emerald-100",
    startTile: "bg-gradient-to-br from-blue-200 to-cyan-300",
    finishTile: "bg-gradient-to-br from-orange-200 to-rose-300",
    ...baseTile,
  },
  castle: {
    id: "castle" as const,
    boardBg: "linear-gradient(180deg, #78716c22 0%, #a855f733 100%)",
    pathTile: "bg-gradient-to-br from-stone-100 to-amber-100",
    grassTile: "bg-gradient-to-br from-purple-50 to-stone-100",
    startTile: "bg-gradient-to-br from-violet-200 to-purple-300",
    finishTile: "bg-gradient-to-br from-yellow-300 to-amber-400",
    ...baseTile,
  },
} satisfies Record<BoardThemeId, Record<string, string>>;

export function getBoardTheme(id: BoardThemeId = "classroom") {
  return BOARD_THEME[id];
}
