import {
  VOCAB_LEARN_BORDER_SLOT,
  VOCAB_LEARN_CENTER_VOID,
  learnBorderLayoutForWordId,
  wordIdFromLearnImageId,
} from "./vocab-learn-new-word";
import { randomWithSeed } from "./shuffle";

export const VOCAB_LEARN_STICKER_HINT = "Match each picture to its shadow.";
export const VOCAB_LEARN_STICKER_FALL_MS = 750;

/** Seeded scatter positions inside the center void (percent of stage). */
export function scatterLearnStickerPositions(
  imageItemIds: readonly string[],
  orderedWordIds: readonly string[],
  seed: string,
): Record<string, { x_percent: number; y_percent: number }> {
  const { w, h } = VOCAB_LEARN_BORDER_SLOT;
  const voidR = VOCAB_LEARN_CENTER_VOID;
  const pad = 2;
  const minX = voidR.x + pad;
  const minY = voidR.y + pad;
  const maxX = voidR.x + voidR.w - w - pad;
  const maxY = voidR.y + voidR.h - h - pad;
  const spanX = Math.max(0, maxX - minX);
  const spanY = Math.max(0, maxY - minY);

  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const out: Record<string, { x_percent: number; y_percent: number }> = {};

  const overlaps = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  let fallbackIndex = 0;
  for (const imgId of imageItemIds) {
    let found = false;
    for (let attempt = 0; attempt < 48; attempt++) {
      const x = minX + randomWithSeed(`${seed}:${imgId}:${attempt}:x`) * spanX;
      const y = minY + randomWithSeed(`${seed}:${imgId}:${attempt}:y`) * spanY;
      const rect = { x, y, w, h };
      if (!placed.some((p) => overlaps(p, rect))) {
        placed.push(rect);
        out[imgId] = { x_percent: x, y_percent: y };
        found = true;
        break;
      }
    }
    if (!found) {
      const cols = 4;
      const col = fallbackIndex % cols;
      const row = Math.floor(fallbackIndex / cols);
      fallbackIndex += 1;
      out[imgId] = {
        x_percent: minX + col * (w + 2.5),
        y_percent: minY + row * (h + 2.5),
      };
    }
  }

  return out;
}

/** True when image center lies on the shadow rect for `targetWordId`. */
export function stickerImageHitsShadow(
  pos: { x_percent: number; y_percent: number },
  displayW: number,
  displayH: number,
  targetWordId: string,
  orderedWordIds: readonly string[],
): boolean {
  const cx = pos.x_percent + displayW / 2;
  const cy = pos.y_percent + displayH / 2;
  const slot = learnBorderLayoutForWordId(targetWordId, orderedWordIds);
  return (
    cx >= slot.x &&
    cx <= slot.x + slot.w &&
    cy >= slot.y &&
    cy <= slot.y + slot.h
  );
}

export function allStickerWordsMatched(
  orderedWordIds: readonly string[],
  matched: Record<string, true | undefined>,
): boolean {
  return (
    orderedWordIds.length > 0 &&
    orderedWordIds.every((wordId) => matched[wordId] === true)
  );
}

export function learnImageIdsForWordIds(orderedWordIds: readonly string[]): string[] {
  return orderedWordIds.map((id) => `learn-${id}-img`);
}

export function isLearnImageMatched(
  imageItemId: string,
  matched: Record<string, true | undefined>,
): boolean {
  const wordId = wordIdFromLearnImageId(imageItemId);
  return !!wordId && matched[wordId] === true;
}
