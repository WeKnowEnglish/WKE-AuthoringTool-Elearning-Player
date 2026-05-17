/**
 * KEY DISPLAY — Vocabulary spotlight reveal
 *
 * One word at a time: large, centered, no card chrome, on the light-blue story stage.
 * Border frame of PNG silhouettes (same asset, dark blue CSS fill); empty center void; "New word" reveals + TTS.
 *
 * Preserve when extending vocab sets or the learn screen:
 * - `layoutLearnBorderSlot` for shadow placement (not a center grid)
 * - `VOCAB_LEARN_SPOTLIGHT` for image placement (inside center void)
 * - `show_card: false` on spotlight images
 * - One word in the spotlight at a time; after dwell, flies to its border slot and stays (`StoryBookView`)
 *
 * Do not revert to full-grid picture cards or tap-each-cell reveal.
 */
import type { StoryItem } from "@/lib/lesson-schemas";

export const VOCAB_LEARN_PAGE_ID = "learn-grid";
export const VOCAB_LEARN_BTN_ID = "learn-btn-new-word";
export const VOCAB_LEARN_BTN_LABEL_NEW_WORD = "New word";
export const VOCAB_LEARN_BTN_LABEL_STICKER_MODE = "Sticker mode";
/** After sticker arranging; advances the learn screen. */
export const VOCAB_LEARN_BTN_LABEL_NEXT = "Next";
export const VOCAB_LEARN_INTRO_PHASE_ID = "learn-intro";
export const VOCAB_LEARN_PLAY_PHASE_ID = "learn-play";
export const VOCAB_LEARN_DONE_PHASE_ID = "learn-done";

/** Learn stage background (light blue). */
export const VOCAB_LEARN_PAGE_BACKGROUND = "#dbeafe";

/**
 * CSS filter for border shadow slots (PNG alpha → dark blue, pairs with light-blue stage).
 * `brightness(0)` first, then colorize toward ~#1e40af.
 */
export const VOCAB_LEARN_SHADOW_FILTER =
  "brightness(0) saturate(100%) invert(17%) sepia(89%) saturate(2476%) hue-rotate(212deg) brightness(0.92)";

/** Slightly lighter blue while dragging in sticker mode. */
export const VOCAB_LEARN_SHADOW_STICKER_FILTER =
  "brightness(0) saturate(100%) invert(22%) sepia(75%) saturate(2000%) hue-rotate(212deg) brightness(0.95) opacity(0.88)";

/** Reserved empty center on the learn stage (shadows sit outside this rect). */
export const VOCAB_LEARN_CENTER_VOID = {
  x: 22,
  y: 18,
  w: 56,
  h: 46,
} as const;

/** Uniform border slot size for every word shadow. */
export const VOCAB_LEARN_BORDER_SLOT = {
  w: 15,
  h: 12,
} as const;

const STAGE_MARGIN = 3;
const TOP_Y = STAGE_MARGIN;
/** Bottom row sits above the New word button (y ≈ 82). */
const BOTTOM_Y = 66;

/**
 * Center spotlight frame (percent of story stage).
 * All learn images share this rect so each word appears singly, central, and bright.
 */
export const VOCAB_LEARN_SPOTLIGHT = {
  x: VOCAB_LEARN_CENTER_VOID.x + 2,
  y: VOCAB_LEARN_CENTER_VOID.y + 2,
  w: VOCAB_LEARN_CENTER_VOID.w - 4,
  h: VOCAB_LEARN_CENTER_VOID.h - 4,
} as const;

/** Pause in the spotlight before flying to the border (KEY DISPLAY). */
export const VOCAB_LEARN_DWELL_MS = 3000;
/** Shorter spotlight pause when the OS prefers reduced motion (fly is instant). */
export const VOCAB_LEARN_DWELL_REDUCED_MS = 1200;
/** Normal fly duration (percent layout transition). */
export const VOCAB_LEARN_FLY_MS = 600;
/** Fly duration when the learner presses New word early. */
export const VOCAB_LEARN_FLY_FAST_MS = 150;

export type VocabLearnImagePhase = "spotlight" | "flying" | "settled";

/** Tap feedback on a settled border word (Web Animations via StoryBookView). */
export const VOCAB_LEARN_REPLAY_EMPHASIS_MS = 420;
/** Bouncy scale pop when tapping a settled learn picture. */
export const VOCAB_LEARN_TAP_POP_PRESET = "pop" as const;

export function isVocabLearnReplayPhase(phaseId: string | undefined | null): boolean {
  return phaseId === VOCAB_LEARN_PLAY_PHASE_ID || phaseId === VOCAB_LEARN_DONE_PHASE_ID;
}

export function isVocabLearnSettledImagePhase(
  phase: VocabLearnImagePhase | undefined,
): phase is "settled" {
  return phase === "settled";
}

export function learnImageIdForWordId(wordId: string): string {
  return `learn-${wordId}-img`;
}

export function learnBorderLayoutForWordId(
  wordId: string,
  orderedWordIds: readonly string[],
): { x: number; y: number; w: number; h: number } {
  const index = orderedWordIds.indexOf(wordId);
  const total = orderedWordIds.length;
  if (index < 0 || total <= 0) return layoutLearnBorderSlot(0, Math.max(1, total));
  return layoutLearnBorderSlot(index, total);
}

/** On-stage rect for a settled `learn-*-img` (border slot, not spotlight payload size). */
export function learnSettledImageLayout(
  imageItemId: string,
  orderedWordIds: readonly string[],
): { x: number; y: number; w: number; h: number } {
  const wordId = wordIdFromLearnImageId(imageItemId);
  if (!wordId) {
    return {
      x: 0,
      y: 0,
      w: VOCAB_LEARN_BORDER_SLOT.w,
      h: VOCAB_LEARN_BORDER_SLOT.h,
    };
  }
  return learnBorderLayoutForWordId(wordId, orderedWordIds);
}

export function getOrderedLearnWordIds(items: StoryItem[]): string[] {
  return getVocabLearnImageItems(items)
    .map((it) => wordIdFromLearnImageId(it.id))
    .filter((id): id is string => !!id);
}

export type LearnBorderSideCounts = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** How many shadow slots on each edge (clockwise from top). */
export function computeLearnBorderSlotCounts(total: number): LearnBorderSideCounts {
  if (total <= 0) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (total <= 4) return { top: total, right: 0, bottom: 0, left: 0 };
  if (total <= 8) {
    const top = Math.ceil(total / 2);
    return { top, right: 0, bottom: total - top, left: 0 };
  }
  if (total === 12) return { top: 4, right: 2, bottom: 4, left: 2 };
  const top = Math.max(2, Math.round(total * 0.3));
  const bottom = Math.max(2, Math.round(total * 0.3));
  const sides = Math.max(0, total - top - bottom);
  const right = Math.ceil(sides / 2);
  const left = sides - right;
  return { top, right, bottom, left };
}

function spreadSlotPositions(
  count: number,
  start: number,
  end: number,
  slotSize: number,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [start + (end - start - slotSize) / 2];
  const span = end - start - slotSize;
  return Array.from({ length: count }, (_, i) => start + (span * i) / (count - 1));
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Percent layout for learn shadow `index` of `total` words around the stage border.
 * Order: top (L→R), right (T→B), bottom (R→L), left (B→T).
 */
export function layoutLearnBorderSlot(
  index: number,
  total: number,
): { x: number; y: number; w: number; h: number } {
  const { w, h } = VOCAB_LEARN_BORDER_SLOT;
  const counts = computeLearnBorderSlotCounts(total);
  const sides = [
    counts.top,
    counts.right,
    counts.bottom,
    counts.left,
  ] as const;
  const sideIndex = sides.findIndex((_, i) => {
    const offset = sides.slice(0, i).reduce((s, n) => s + n, 0);
    return index < offset + sides[i]!;
  });
  const side =
    sideIndex === 0 ? "top"
    : sideIndex === 1 ? "right"
    : sideIndex === 2 ? "bottom"
    : "left";
  const offsetOnSide =
    index -
    sides.slice(0, sideIndex).reduce((s, n) => s + n, 0);
  const countOnSide = sides[sideIndex] ?? 0;

  const voidRect = VOCAB_LEARN_CENTER_VOID;
  const horizStart = STAGE_MARGIN;
  const horizEnd = 100 - STAGE_MARGIN;
  const vertStart = TOP_Y + h + 2;
  const vertEnd = BOTTOM_Y - 2;

  if (side === "top") {
    const xs = spreadSlotPositions(countOnSide, horizStart, horizEnd, w);
    return { x: xs[offsetOnSide]!, y: TOP_Y, w, h };
  }
  if (side === "bottom") {
    const xs = spreadSlotPositions(countOnSide, horizStart, horizEnd, w);
    return { x: xs[countOnSide - 1 - offsetOnSide]!, y: BOTTOM_Y, w, h };
  }
  if (side === "right") {
    const ys = spreadSlotPositions(countOnSide, vertStart, vertEnd, h);
    return { x: horizEnd - w, y: ys[offsetOnSide]!, w, h };
  }
  const ys = spreadSlotPositions(countOnSide, vertStart, vertEnd, h);
  return { x: horizStart, y: ys[countOnSide - 1 - offsetOnSide]!, w, h };
}

/** True when a border slot rect does not overlap the center void (layout sanity check). */
export function learnBorderSlotClearsCenterVoid(
  rect: { x: number; y: number; w: number; h: number },
): boolean {
  return !rectsOverlap(rect, VOCAB_LEARN_CENTER_VOID);
}

const LEARN_IMG_PREFIX = "learn-";
const LEARN_IMG_SUFFIX = "-img";
const LEARN_SLOT_SUFFIX = "-slot";

export function isVocabLearnNewWordPage(page: { id: string }): boolean {
  return page.id === VOCAB_LEARN_PAGE_ID;
}

export function isVocabLearnImageItemId(id: string): boolean {
  return id.startsWith(LEARN_IMG_PREFIX) && id.endsWith(LEARN_IMG_SUFFIX);
}

export function isVocabLearnSlotItemId(id: string): boolean {
  return id.startsWith(LEARN_IMG_PREFIX) && id.endsWith(LEARN_SLOT_SUFFIX);
}

export function wordIdFromLearnImageId(imageItemId: string): string | null {
  if (!isVocabLearnImageItemId(imageItemId)) return null;
  return imageItemId.slice(LEARN_IMG_PREFIX.length, -LEARN_IMG_SUFFIX.length);
}

export function wordIdFromLearnSlotItemId(slotItemId: string): string | null {
  if (!isVocabLearnSlotItemId(slotItemId)) return null;
  return slotItemId.slice(LEARN_IMG_PREFIX.length, -LEARN_SLOT_SUFFIX.length);
}

export function getVocabLearnImageItems(items: StoryItem[]): StoryItem[] {
  return items.filter((it) => isVocabLearnImageItemId(it.id));
}
