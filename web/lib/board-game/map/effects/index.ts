export type { ResolvedEffect, EffectFeedback } from "@/lib/board-game/map/effects/resolve-effect";
export {
  defaultCorrectEffect,
  isEmptyEffect,
  mergeEffects,
  penaltyTypeToResolved,
  resolveCorrectEffect,
  resolveDefaultLandEffectByType,
  resolveLandEffect,
  resolveWrongEffect,
  shortcutJumpEffect,
} from "@/lib/board-game/map/effects/resolve-effect";
export { feedbackForEffectType, feedbackForResolvedEffect } from "@/lib/board-game/map/effects/effect-copy";
export { shouldAskQuestion, hasLandEffect } from "@/lib/board-game/map/effects/landing-rules";
export { resolveConnectionOnLand, connectionLabel } from "@/lib/board-game/map/effects/connections";
export { applyResolvedEffect, effectRequiresMovement } from "@/lib/board-game/map/effects/apply-map-effect";
export { planLandingSequence, planCorrectAnswerSequence, planWrongAnswerSequence } from "@/lib/board-game/map/effects/landing-sequence";
