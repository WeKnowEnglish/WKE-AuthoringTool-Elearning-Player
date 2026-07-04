import type { MapSpaceEffectType, MapSpaceType } from "@/lib/board-game/map/types";
import type { PenaltyType } from "@/lib/board-game/types";

/** Engine actions produced from map effect definitions. */
export type ResolvedEffect = {
  scoreDelta?: number;
  moveSteps?: number;
  skipNextTurn?: boolean;
  rollAgain?: boolean;
  goToPathIndex?: number;
  goToStart?: boolean;
  goToCheckpoint?: boolean;
  stealPointFromLeader?: boolean;
  swapWithLeader?: boolean;
};

export type EffectFeedback = {
  title: string;
  message: string;
  emoji: string;
  tone: "lucky" | "penalty" | "neutral" | "shortcut";
};

type EffectFields = {
  points?: number;
  moveAmount?: number;
  correctPoints?: number;
  wrongPoints?: number;
};

function fromEffectType(type: MapSpaceEffectType, fields?: EffectFields): ResolvedEffect {
  switch (type) {
    case "moveAhead3":
      return { moveSteps: fields?.moveAmount ?? 3 };
    case "moveBack2":
      return { moveSteps: -(fields?.moveAmount ?? 2) };
    case "rollAgain":
      return { rollAgain: true };
    case "stealPoint":
      return { stealPointFromLeader: true };
    case "skipTurn":
      return { skipNextTurn: true };
    case "swapLeader":
      return { swapWithLeader: true };
    default:
      return {};
  }
}

function mergeFields(base: ResolvedEffect, fields?: EffectFields): ResolvedEffect {
  const next = { ...base };
  if (fields?.points !== undefined) {
    next.scoreDelta = (next.scoreDelta ?? 0) + fields.points;
  }
  if (fields?.moveAmount !== undefined && next.moveSteps === undefined) {
    next.moveSteps = fields.moveAmount;
  }
  return next;
}

export function isEmptyEffect(effect: ResolvedEffect): boolean {
  return Object.keys(effect).length === 0;
}

export function mergeEffects(...effects: ResolvedEffect[]): ResolvedEffect {
  const merged: ResolvedEffect = {};
  for (const effect of effects) {
    if (effect.scoreDelta) merged.scoreDelta = (merged.scoreDelta ?? 0) + effect.scoreDelta;
    if (effect.moveSteps) merged.moveSteps = (merged.moveSteps ?? 0) + effect.moveSteps;
    if (effect.skipNextTurn) merged.skipNextTurn = true;
    if (effect.rollAgain) merged.rollAgain = true;
    if (effect.goToPathIndex !== undefined) merged.goToPathIndex = effect.goToPathIndex;
    if (effect.goToStart) merged.goToStart = true;
    if (effect.goToCheckpoint) merged.goToCheckpoint = true;
    if (effect.stealPointFromLeader) merged.stealPointFromLeader = true;
    if (effect.swapWithLeader) merged.swapWithLeader = true;
  }
  return merged;
}

export function defaultCorrectEffect(): ResolvedEffect {
  return { scoreDelta: 1 };
}

export function penaltyTypeToResolved(penalty: PenaltyType): ResolvedEffect {
  switch (penalty) {
    case "back1":
      return { moveSteps: -1 };
    case "back2":
      return { moveSteps: -2 };
    case "losePoint":
      return { scoreDelta: -1 };
    case "missTurn":
      return { skipNextTurn: true };
    case "checkpoint":
      return { goToCheckpoint: true };
    case "start":
      return { goToStart: true };
    case "rollAgain":
      return { rollAgain: true };
    default:
      return {};
  }
}

export function resolveDefaultLandEffectByType(type: MapSpaceType, fields?: EffectFields): ResolvedEffect {
  switch (type) {
    case "bonus":
      return mergeFields({ scoreDelta: 1 }, fields);
    case "penalty":
      return mergeFields({ moveSteps: -(fields?.moveAmount ?? 1) }, fields);
    case "moveForward":
      return mergeFields({ moveSteps: fields?.moveAmount ?? 1 }, fields);
    case "moveBackward":
      return mergeFields({ moveSteps: -(fields?.moveAmount ?? 1) }, fields);
    case "skipTurn":
      return { skipNextTurn: true };
    case "rollAgain":
      return { rollAgain: true };
    default:
      return mergeFields({}, fields);
  }
}

export function resolveLandEffect(
  space: { type: MapSpaceType; effect?: MapSpaceEffectType; effects?: EffectFields & { onLand?: MapSpaceEffectType } },
): ResolvedEffect {
  if (space.effects?.onLand) {
    return mergeFields(fromEffectType(space.effects.onLand, space.effects), space.effects);
  }
  if (space.effect) {
    return mergeFields(fromEffectType(space.effect, space.effects), space.effects);
  }
  return resolveDefaultLandEffectByType(space.type, space.effects);
}

export function resolveCorrectEffect(
  space: {
    type: MapSpaceType;
    effects?: EffectFields & { onCorrect?: MapSpaceEffectType };
  },
): ResolvedEffect {
  if (space.effects?.onCorrect) {
    return mergeFields(fromEffectType(space.effects.onCorrect, space.effects), space.effects);
  }
  if (space.effects?.correctPoints !== undefined) {
    return { scoreDelta: space.effects.correctPoints };
  }
  if (space.effects?.points !== undefined && space.effects.points > 0) {
    return { scoreDelta: space.effects.points };
  }
  return defaultCorrectEffect();
}

export function resolveWrongEffect(
  space: {
    type: MapSpaceType;
    effects?: EffectFields & { onWrong?: MapSpaceEffectType };
  },
  fallbackPenalty: PenaltyType,
): ResolvedEffect {
  if (space.effects?.onWrong) {
    return mergeFields(fromEffectType(space.effects.onWrong, space.effects), space.effects);
  }
  if (space.effects?.wrongPoints !== undefined) {
    return { scoreDelta: space.effects.wrongPoints };
  }
  if (space.effects?.points !== undefined && space.effects.points < 0) {
    return { scoreDelta: space.effects.points };
  }
  return penaltyTypeToResolved(fallbackPenalty);
}

export function shortcutJumpEffect(destinationPathIndex: number): ResolvedEffect {
  return { goToPathIndex: destinationPathIndex };
}
