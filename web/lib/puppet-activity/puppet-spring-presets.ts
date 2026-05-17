import type { Transition } from "motion/react";
import type { PartMotionTune } from "./part-motion-tune";
import { clampMotionTune } from "./part-motion-tune";
import type { PuppetPartKey } from "./types";

export const PUPPET_SPRING = {
  idle: { type: "spring" as const, stiffness: 38, damping: 7, mass: 1.05 },
  follow: { type: "spring" as const, stiffness: 52, damping: 9, mass: 0.85 },
  wave: { type: "spring" as const, stiffness: 120, damping: 14, mass: 0.9 },
  nod: { type: "spring" as const, stiffness: 90, damping: 12, mass: 0.8 },
  preview: { type: "spring" as const, stiffness: 55, damping: 10, mass: 0.9 },
} as const;

const BASE_IDLE_DURATION_MS: Record<PuppetPartKey, number> = {
  body: 2800,
  head: 3200,
  upperArm: 3600,
  lowerArm: 3100,
  hand: 2700,
};

/** Stagger child joints so the arm reads as a whip, not five independent loops. */
const IDLE_FOLLOW_DELAY_S: Partial<Record<PuppetPartKey, number>> = {
  head: 0.12,
  upperArm: 0.08,
  lowerArm: 0.22,
  hand: 0.35,
};

export function idleDurationMs(
  part: PuppetPartKey,
  tuneInput: PartMotionTune,
  preview = false,
): number {
  const tune = clampMotionTune(tuneInput);
  const base = BASE_IDLE_DURATION_MS[part];
  if (preview) return Math.round(2200 / tune.speed);
  return Math.round(base / tune.speed);
}

export function idleFollowDelayS(part: PuppetPartKey): number {
  return IDLE_FOLLOW_DELAY_S[part] ?? 0;
}

/**
 * Repeating idle uses tween + mirror (reliable infinite loop in Motion 12).
 * Springs are reserved for one-shot wave/nod beats.
 */
export function buildIdleMotionTransition(
  part: PuppetPartKey,
  tuneInput: PartMotionTune,
  preview = false,
): Transition {
  const halfCycleSec = idleDurationMs(part, tuneInput, preview) / 2000;
  return {
    duration: halfCycleSec,
    ease: "easeInOut",
    repeat: Infinity,
    repeatType: "mirror",
    delay: idleFollowDelayS(part),
  };
}
