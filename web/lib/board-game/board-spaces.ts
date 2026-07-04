import type { BoardSpaceMeta, SpaceEffectType, SpaceKind } from "@/lib/board-game/types";

const SPACE_CONFIG: Record<
  Exclude<SpaceKind, "normal">,
  { effect: SpaceEffectType; label: string; emoji: string }
> = {
  bonus: { effect: "moveAhead3", label: "Bonus Star", emoji: "⭐" },
  treasure: { effect: "stealPoint", label: "Treasure", emoji: "🎁" },
  mystery: { effect: "rollAgain", label: "Mystery", emoji: "❓" },
  jump: { effect: "moveAhead3", label: "Jump Ahead", emoji: "🐸" },
  trap: { effect: "moveBack2", label: "Trap", emoji: "💣" },
};

const EFFECT_MESSAGES: Record<SpaceEffectType, string> = {
  moveAhead3: "Move ahead 3 spaces!",
  moveBack2: "Move back 2 spaces!",
  rollAgain: "Roll again!",
  stealPoint: "Steal 1 point from the leader!",
  skipTurn: "Skip your next turn!",
  swapLeader: "Swap places with the leader!",
};

export function spaceEffectMessage(effect: SpaceEffectType): string {
  return EFFECT_MESSAGES[effect];
}

export function generateBoardSpaces(
  boardLength: number,
  random: () => number = Math.random,
): BoardSpaceMeta[] {
  const spaces: BoardSpaceMeta[] = [];
  const candidates: number[] = [];

  for (let i = 2; i < boardLength; i++) {
    if (i % 4 === 0 || i % 5 === 0) {
      candidates.push(i);
    }
  }

  const kinds = Object.keys(SPACE_CONFIG) as Exclude<SpaceKind, "normal">[];
  const shuffled = [...candidates].sort(() => random() - 0.5);
  const count = Math.min(Math.max(3, Math.floor(boardLength / 5)), shuffled.length);

  for (let i = 0; i < count; i++) {
    const index = shuffled[i]!;
    const kind = kinds[i % kinds.length]!;
    const config = SPACE_CONFIG[kind];
    spaces.push({
      index,
      kind,
      effect: config.effect,
      label: config.label,
      emoji: config.emoji,
    });
  }

  return spaces.sort((a, b) => a.index - b.index);
}

export function getSpaceAt(
  boardSpaces: BoardSpaceMeta[],
  index: number,
): BoardSpaceMeta | null {
  return boardSpaces.find((space) => space.index === index) ?? null;
}
