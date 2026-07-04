export const DICE_ROLL_MS = 1000;
export const HOP_MS = 220;
export const JUMP_TRAVEL_MS = 320;
export const LANDING_MS = 400;
export const CELEBRATION_MS = 1600;
export const PENALTY_MS = 1400;
export const TURN_HANDOFF_MS = 900;
export const LUCKY_SPACE_MS = 1200;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hopDuration(): number {
  return prefersReducedMotion() ? 0 : HOP_MS;
}

export function hopTransitionSeconds(): number {
  return prefersReducedMotion() ? 0 : HOP_MS / 1000;
}

export function jumpTransitionSeconds(): number {
  return prefersReducedMotion() ? 0 : JUMP_TRAVEL_MS / 1000;
}

export function shouldUseTravelLayer(): boolean {
  return !prefersReducedMotion();
}

export function diceRollDuration(): number {
  return prefersReducedMotion() ? 200 : DICE_ROLL_MS;
}
