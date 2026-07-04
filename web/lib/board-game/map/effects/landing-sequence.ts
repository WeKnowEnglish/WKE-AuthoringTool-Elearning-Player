import { connectionLabel, resolveConnectionOnLand } from "@/lib/board-game/map/effects/connections";
import { feedbackForResolvedEffect } from "@/lib/board-game/map/effects/effect-copy";
import {
  isEmptyEffect,
  resolveCorrectEffect,
  resolveLandEffect,
  resolveWrongEffect,
  shortcutJumpEffect,
} from "@/lib/board-game/map/effects/resolve-effect";
import { hasLandEffect, shouldAskQuestion } from "@/lib/board-game/map/effects/landing-rules";
import { spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import type { ResolvedEffect } from "@/lib/board-game/map/effects/resolve-effect";
import type { BoardMap } from "@/lib/board-game/map/types";

export type EffectFeedbackState = {
  title: string;
  message: string;
  emoji: string;
  tone: "lucky" | "penalty" | "neutral" | "shortcut";
};

export type LandingStep =
  | {
      kind: "shortcut";
      destinationPathIndex: number;
      effect: ResolvedEffect;
      feedback: EffectFeedbackState;
    }
  | {
      kind: "landEffect";
      pathIndex: number;
      effect: ResolvedEffect;
      feedback: EffectFeedbackState;
    }
  | { kind: "question"; dice: number; pathIndex: number }
  | { kind: "rollAgain" }
  | { kind: "endTurn" };

export function planLandingSequence(map: BoardMap, pathIndex: number, dice: number): LandingStep[] {
  const boardLength = map.pathOrder.length - 1;
  const steps: LandingStep[] = [];
  let currentIndex = pathIndex;

  const shortcut = resolveConnectionOnLand(map, currentIndex);
  if (shortcut) {
    const effect = shortcutJumpEffect(shortcut.destinationPathIndex);
    steps.push({
      kind: "shortcut",
      destinationPathIndex: shortcut.destinationPathIndex,
      effect,
      feedback: feedbackForResolvedEffect(effect, {
        shortcutLabel: connectionLabel(map, shortcut.destinationPathIndex),
      }),
    });
    currentIndex = shortcut.destinationPathIndex;
  }

  const space = spaceAtPathIndex(map, currentIndex);
  if (space && hasLandEffect(space)) {
    const effect = resolveLandEffect(space);
    if (!isEmptyEffect(effect)) {
      steps.push({
        kind: "landEffect",
        pathIndex: currentIndex,
        effect,
        feedback: feedbackForResolvedEffect(effect),
      });
      if (effect.rollAgain) {
        steps.push({ kind: "rollAgain" });
        return steps;
      }
    }
  }

  if (shouldAskQuestion(space, currentIndex, boardLength)) {
    steps.push({ kind: "question", dice, pathIndex: currentIndex });
  } else {
    steps.push({ kind: "endTurn" });
  }

  return steps;
}

export function planCorrectAnswerSequence(
  map: BoardMap,
  pathIndex: number,
): { effect: ResolvedEffect; feedback: EffectFeedbackState } {
  const space = spaceAtPathIndex(map, pathIndex);
  const effect = resolveCorrectEffect(space ?? { type: "question" });
  return { effect, feedback: feedbackForResolvedEffect(effect) };
}

export function planWrongAnswerSequence(
  map: BoardMap,
  pathIndex: number,
  fallbackPenalty: import("@/lib/board-game/types").PenaltyType,
): { effect: ResolvedEffect; feedback: EffectFeedbackState } {
  const space = spaceAtPathIndex(map, pathIndex);
  const effect = resolveWrongEffect(space ?? { type: "question" }, fallbackPenalty);
  return {
    effect,
    feedback: feedbackForResolvedEffect(effect, { penalty: fallbackPenalty }),
  };
}
