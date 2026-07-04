import type { ResolvedEffect } from "@/lib/board-game/map/effects/resolve-effect";
import type { MapSpaceEffectType } from "@/lib/board-game/map/types";
import type { PenaltyType } from "@/lib/board-game/types";

const EFFECT_MESSAGES: Record<MapSpaceEffectType, { title: string; message: string; emoji: string }> = {
  moveAhead3: { title: "Bonus!", message: "Move ahead 3 spaces!", emoji: "⭐" },
  moveBack2: { title: "Oh no!", message: "Move back 2 spaces!", emoji: "💣" },
  rollAgain: { title: "Lucky!", message: "Roll again!", emoji: "🎲" },
  stealPoint: { title: "Treasure!", message: "Steal 1 point from the leader!", emoji: "🎁" },
  skipTurn: { title: "Wait!", message: "Skip your next turn!", emoji: "⏸️" },
  swapLeader: { title: "Swap!", message: "Swap places with the leader!", emoji: "🔄" },
};

const PENALTY_MESSAGES: Record<PenaltyType, { title: string; message: string; emoji: string }> = {
  back1: { title: "Oh no!", message: "Move back 1 space.", emoji: "🍌" },
  back2: { title: "Yikes!", message: "Move back 2 spaces.", emoji: "🐒" },
  losePoint: { title: "Oops!", message: "Lose 1 point!", emoji: "💨" },
  missTurn: { title: "Wait!", message: "Miss your next turn!", emoji: "⏸️" },
  checkpoint: { title: "Rewind!", message: "Go back to your last checkpoint.", emoji: "⏪" },
  start: { title: "All the way back!", message: "Return to Start!", emoji: "🏁" },
  rollAgain: { title: "Lucky break?", message: "Roll again!", emoji: "🎲" },
};

export function feedbackForEffectType(
  type: MapSpaceEffectType,
  tone: "lucky" | "penalty" | "neutral" = "lucky",
): { title: string; message: string; emoji: string; tone: typeof tone } {
  const copy = EFFECT_MESSAGES[type];
  return { ...copy, tone };
}

export function feedbackForResolvedEffect(
  effect: ResolvedEffect,
  context?: { penalty?: PenaltyType; shortcutLabel?: string },
): { title: string; message: string; emoji: string; tone: "lucky" | "penalty" | "neutral" | "shortcut" } {
  if (context?.shortcutLabel) {
    return {
      title: "Shortcut!",
      message: `Jump to ${context.shortcutLabel}!`,
      emoji: "🌉",
      tone: "shortcut",
    };
  }

  if (effect.goToPathIndex !== undefined && !context?.shortcutLabel) {
    return {
      title: "Shortcut!",
      message: `Jump to space ${effect.goToPathIndex}!`,
      emoji: "🌉",
      tone: "shortcut",
    };
  }

  if (effect.scoreDelta !== undefined && effect.scoreDelta > 0) {
    return {
      title: "Great job!",
      message: `Gain ${effect.scoreDelta} point${effect.scoreDelta === 1 ? "" : "s"}!`,
      emoji: "⭐",
      tone: "lucky",
    };
  }

  if (effect.scoreDelta !== undefined && effect.scoreDelta < 0) {
    return {
      title: "Oops!",
      message: `Lose ${Math.abs(effect.scoreDelta)} point${Math.abs(effect.scoreDelta) === 1 ? "" : "s"}!`,
      emoji: "💨",
      tone: "penalty",
    };
  }

  if (effect.moveSteps !== undefined && effect.moveSteps > 0) {
    return {
      title: "Bonus!",
      message: `Move forward ${effect.moveSteps} space${effect.moveSteps === 1 ? "" : "s"}!`,
      emoji: "🐸",
      tone: "lucky",
    };
  }

  if (effect.moveSteps !== undefined && effect.moveSteps < 0) {
    return {
      title: "Oh no!",
      message: `Move back ${Math.abs(effect.moveSteps)} space${Math.abs(effect.moveSteps) === 1 ? "" : "s"}!`,
      emoji: "💣",
      tone: "penalty",
    };
  }

  if (effect.rollAgain) {
    return { title: "Roll again!", message: "Take another turn!", emoji: "🎲", tone: "lucky" };
  }

  if (effect.skipNextTurn) {
    return { title: "Wait!", message: "Skip your next turn!", emoji: "⏸️", tone: "penalty" };
  }

  if (effect.goToStart) {
    return { title: "All the way back!", message: "Return to Start!", emoji: "🏁", tone: "penalty" };
  }

  if (effect.goToCheckpoint) {
    return { title: "Rewind!", message: "Go back to your checkpoint!", emoji: "⏪", tone: "penalty" };
  }

  if (effect.stealPointFromLeader) {
    return { ...EFFECT_MESSAGES.stealPoint, tone: "lucky" };
  }

  if (effect.swapWithLeader) {
    return { ...EFFECT_MESSAGES.swapLeader, tone: "lucky" };
  }

  if (context?.penalty) {
    return { ...PENALTY_MESSAGES[context.penalty], tone: "penalty" };
  }

  return { title: "Special space!", message: "Something happened!", emoji: "✨", tone: "neutral" };
}
