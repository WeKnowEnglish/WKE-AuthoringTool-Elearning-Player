/** Reusable puppet asset ids. */
export const PUPPET_IDS = ["default_host"] as const;
export type PuppetId = (typeof PUPPET_IDS)[number];

/** Built-in motion presets for the host. */
export const PUPPET_ANIMATION_IDS = ["idle", "wave", "nod", "none"] as const;
export type PuppetAnimationId = (typeof PUPPET_ANIMATION_IDS)[number];

export const PUPPET_SCRIPT_IDS = ["demo_am_with_i", "like_likes_food"] as const;
export type PuppetScriptId = (typeof PUPPET_SCRIPT_IDS)[number];

export const PUPPET_PART_KEYS = [
  "body",
  "head",
  "upperArm",
  "lowerArm",
  "hand",
] as const;

export type PuppetPartKey = (typeof PUPPET_PART_KEYS)[number];

export type PuppetPartAsset = {
  src: string;
};

/** CSS transform-origin for a part (percent of the shared artboard). */
export type PuppetRigPivots = Partial<Record<PuppetPartKey, string>>;

export type PuppetRigDefinition = {
  id: PuppetId;
  label: string;
  canvasWidth: number;
  canvasHeight: number;
  parts: Record<PuppetPartKey, PuppetPartAsset>;
  /** Per-part rotation origins; defaults applied in PuppetStage when omitted. */
  pivots?: PuppetRigPivots;
};

/** @deprecated Single-image fallback; prefer `PuppetRigDefinition`. */
export type PuppetDefinition = PuppetRigDefinition;

import type { PuppetCaptionLayout } from "./caption-layout";

export type { PuppetCaptionLayout } from "./caption-layout";

export type PuppetLineBeat = {
  kind: "line";
  text: string;
  wordStaggerMs?: number;
  /** One-shot animation before/during the line (defaults to none). */
  puppetAnimation?: PuppetAnimationId;
  /** Where this line appears in the scene (% of scene box). */
  captionLayout?: PuppetCaptionLayout;
  /** Keep visible after Continue (until replaced in `group` or hidden on choice/quiz). */
  persist?: boolean;
  /** Persisted lines with the same group replace each other. */
  group?: string;
  /**
   * One caption per slot on screen. Active line in a slot hides a persist label in that slot
   * (e.g. left slot: "like" label OR "I like …", not both).
   */
  captionSlot?: string;
};

export type PuppetPauseBeat = {
  kind: "pause";
};

export type PuppetQuizTrueFalseBeat = {
  kind: "quiz_true_false";
  statement: string;
  correct: boolean;
  imageUrl?: string;
};

/** Tap one option (e.g. food); stores label for `{{var}}` in later beats. */
export type PuppetChoiceBeat = {
  kind: "choice";
  prompt: string;
  /** Breakfast food ids from `PUPPET_BREAKFAST_FOOD_OPTIONS`. */
  foodIds: string[];
  /** Script variable name (default `food`). */
  storeAs?: string;
  puppetAnimation?: PuppetAnimationId;
  captionLayout?: PuppetCaptionLayout;
};

export type PuppetBeat =
  | PuppetLineBeat
  | PuppetPauseBeat
  | PuppetChoiceBeat
  | PuppetQuizTrueFalseBeat;

export type PuppetScript = {
  id: PuppetScriptId;
  title: string;
  puppetId: PuppetId;
  ttsLang?: string;
  /** Fallback caption placement for line beats without `captionLayout`. */
  defaultCaptionLayout?: PuppetCaptionLayout;
  /** Safety cap for on-screen captions (default 6 in presenter). */
  maxVisibleLines?: number;
  beats: PuppetBeat[];
};

export const DEFAULT_WORD_STAGGER_MS = 140;

export function isPuppetId(id: string): id is PuppetId {
  return (PUPPET_IDS as readonly string[]).includes(id);
}

export function isPuppetScriptId(id: string): id is PuppetScriptId {
  return (PUPPET_SCRIPT_IDS as readonly string[]).includes(id);
}

/** Split line into display tokens (words + attached punctuation). */
export function tokenizeLineForReveal(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.match(/\S+/g);
  return parts ?? [];
}
