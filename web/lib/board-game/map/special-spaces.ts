import type { BoardMapSpace, MapSpaceKind, MapSpaceType } from "@/lib/board-game/map/types";

const SPECIAL_CONFIG: Record<
  Exclude<MapSpaceKind, "normal">,
  { type: MapSpaceType; effect: import("@/lib/board-game/map/types").MapSpaceEffectType; label: string; icon: string }
> = {
  bonus: { type: "bonus", effect: "moveAhead3", label: "Bonus Star", icon: "⭐" },
  treasure: { type: "bonus", effect: "stealPoint", label: "Treasure", icon: "🎁" },
  mystery: { type: "rollAgain", effect: "rollAgain", label: "Mystery", icon: "❓" },
  jump: { type: "moveForward", effect: "moveAhead3", label: "Jump Ahead", icon: "🐸" },
  trap: { type: "penalty", effect: "moveBack2", label: "Trap", icon: "💣" },
};

/** Place special squares on interior path indices (same density as legacy generator). */
export function assignSpecialSpaces(
  pathLength: number,
  random: () => number = Math.random,
): Map<number, Pick<BoardMapSpace, "type" | "kind" | "effect" | "label" | "icon">> {
  const boardLength = pathLength - 1;
  const candidates: number[] = [];

  for (let pathIndex = 2; pathIndex < boardLength; pathIndex++) {
    if (pathIndex % 4 === 0 || pathIndex % 5 === 0) {
      candidates.push(pathIndex);
    }
  }

  const kinds = Object.keys(SPECIAL_CONFIG) as Exclude<MapSpaceKind, "normal">[];
  const shuffled = [...candidates].sort(() => random() - 0.5);
  const count = Math.min(Math.max(3, Math.floor(boardLength / 5)), shuffled.length);
  const result = new Map<number, Pick<BoardMapSpace, "type" | "kind" | "effect" | "label" | "icon">>();

  for (let i = 0; i < count; i++) {
    const pathIndex = shuffled[i]!;
    const kind = kinds[i % kinds.length]!;
    const config = SPECIAL_CONFIG[kind];
    result.set(pathIndex, {
      type: config.type,
      kind,
      effect: config.effect,
      label: config.label,
      icon: config.icon,
    });
  }

  return result;
}

export function spaceLabelForPathIndex(pathIndex: number, boardLength: number): string {
  if (pathIndex === 0) return "Start";
  if (pathIndex === boardLength) return "Finish";
  return String(pathIndex);
}

export function spaceTypeForPathIndex(pathIndex: number, boardLength: number): MapSpaceType {
  if (pathIndex === 0) return "start";
  if (pathIndex === boardLength) return "finish";
  return "question";
}
