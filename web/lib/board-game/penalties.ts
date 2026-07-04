import type { PenaltyCopy, PenaltyType } from "@/lib/board-game/types";

export const PENALTY_COPY: Record<PenaltyType, PenaltyCopy> = {
  back1: { title: "Oh no!", message: "Slippery floor! Move back 1 space.", emoji: "🍌" },
  back2: { title: "Yikes!", message: "The monkey slipped! Move back 2 spaces.", emoji: "🐒" },
  losePoint: { title: "Oops!", message: "Lose 1 point!", emoji: "💨" },
  missTurn: { title: "Wait!", message: "Miss your next turn!", emoji: "⏸️" },
  checkpoint: { title: "Rewind!", message: "Go back to your last checkpoint.", emoji: "⏪" },
  start: { title: "All the way back!", message: "Return to Start!", emoji: "🏁" },
  rollAgain: { title: "Lucky break?", message: "Roll again!", emoji: "🎲" },
};

const PENALTY_POOL: PenaltyType[] = [
  "back1",
  "back2",
  "losePoint",
  "missTurn",
  "checkpoint",
  "start",
  "rollAgain",
];

export function pickRandomPenalty(random: () => number = Math.random): PenaltyType {
  const index = Math.floor(random() * PENALTY_POOL.length);
  return PENALTY_POOL[index]!;
}

export function penaltyCopy(type: PenaltyType): PenaltyCopy {
  return PENALTY_COPY[type];
}
