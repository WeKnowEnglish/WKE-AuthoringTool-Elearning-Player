import type { UiPhase } from "@/lib/board-game/types";

/** Phases where gameplay shortcuts are disabled (animations in progress). */
export function isKeyboardGameplayBlocked(uiPhase: UiPhase): boolean {
  return (
    uiPhase === "diceRolling" ||
    uiPhase === "moving" ||
    uiPhase === "landing" ||
    uiPhase === "luckySpace" ||
    uiPhase === "shortcut" ||
    uiPhase === "celebrating" ||
    uiPhase === "penalty" ||
    uiPhase === "turnHandoff"
  );
}

export const KEYBOARD_SHORTCUTS = [
  { keys: "Space", action: "Roll dice" },
  { keys: "Enter", action: "Mark correct" },
  { keys: "X / Backspace", action: "Mark incorrect" },
  { keys: "S / N", action: "Skip question · next turn" },
  { keys: "M", action: "Toggle sound" },
] as const;
