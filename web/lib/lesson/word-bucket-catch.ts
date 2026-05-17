import { rectsOverlap, type Rect } from "@/lib/teststartpage/chase-game-physics";

/** One vocabulary image in the bucket pool. */
export type WordBucketCatchChoice = {
  id: string;
  image_url: string;
  /** Legacy single-target mode: marks the picture that matches `target_word`. */
  correct: boolean;
  /** Short label for MCQ / TTS (test-start multi-wave deck). */
  label?: string;
};

/** One wave: catch items whose `id` equals `correct_choice_id`. */
export type WordBucketCatchWave = {
  target_word: string;
  correct_choice_id: string;
};

export type WordBucketCatchFallingItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  correct: boolean;
  image_url: string;
};

export type WordBucketCatchConfig = {
  target_word: string;
  required_correct_catches: number;
  /** When `waves` is set, catches needed per wave (default 3). */
  catches_per_wave?: number;
  fall_speed_px_per_sec: number;
  spawn_interval_ms: number;
  item_size_px: number;
  bucket_width_px: number;
  bucket_height_px: number;
  choices: readonly WordBucketCatchChoice[];
  /** Test-start: multiple targets in one run; spawn “correct” rotates by wave. */
  waves?: readonly WordBucketCatchWave[];
};

/** Map lesson payload fields into runtime config for {@link WordBucketCatchCore}. */
export function wordBucketCatchConfigFromPayload(p: {
  target_word: string;
  required_correct_catches?: number;
  fall_speed_px_per_sec?: number;
  spawn_interval_ms?: number;
  item_size_px?: number;
  bucket_width_px?: number;
  bucket_height_px?: number;
  choices: readonly WordBucketCatchChoice[];
}): WordBucketCatchConfig {
  return {
    target_word: p.target_word,
    required_correct_catches: p.required_correct_catches ?? 5,
    fall_speed_px_per_sec: p.fall_speed_px_per_sec ?? 155,
    spawn_interval_ms: p.spawn_interval_ms ?? 1350,
    item_size_px: p.item_size_px ?? 56,
    bucket_width_px: p.bucket_width_px ?? 88,
    bucket_height_px: p.bucket_height_px ?? 52,
    choices: p.choices,
  };
}

export type BucketRectInput = {
  playfieldW: number;
  playfieldH: number;
  bucketXCenter: number;
  bucketW: number;
  bucketH: number;
  bottomPad: number;
};

export function bucketRectFromInput(p: BucketRectInput): Rect {
  const x = p.bucketXCenter - p.bucketW / 2;
  const y = p.playfieldH - p.bottomPad - p.bucketH;
  return { x, y, w: p.bucketW, h: p.bucketH };
}

/**
 * Hit test uses only the “mouth” at the top of the bucket sprite. The full bucket
 * rectangle extends to the playfield floor; using it for AABB overlap makes the
 * floor look like the bucket (anything resting on the bottom registers as caught).
 */
export function bucketCatchZoneRect(bucket: Rect): Rect {
  const insetX = bucket.w * 0.12;
  const catchW = Math.max(28, bucket.w - insetX * 2);
  const catchH = Math.max(16, Math.min(bucket.h * 0.42, bucket.h * 0.55));
  const x = bucket.x + bucket.w / 2 - catchW / 2;
  const y = bucket.y;
  return { x, y, w: catchW, h: catchH };
}

export type StepCatchResult =
  | { kind: "none" }
  | { kind: "caught_correct" }
  | { kind: "caught_wrong" };

/**
 * Advance falling items and detect catches against the bucket **mouth** only.
 * Items that leave the bottom of the playfield are removed with no penalty (wrong
 * may fall away; correct may be missed without ending the round).
 */
export function stepWordBucketCatch(
  items: WordBucketCatchFallingItem[],
  dtSec: number,
  cfg: Pick<
    WordBucketCatchConfig,
    "fall_speed_px_per_sec" | "item_size_px"
  >,
  playfieldH: number,
  catchZone: Rect,
): { next: WordBucketCatchFallingItem[]; result: StepCatchResult } {
  const dy = cfg.fall_speed_px_per_sec * dtSec;
  const next: WordBucketCatchFallingItem[] = [];
  let result: StepCatchResult = { kind: "none" };

  for (const it of items) {
    if (result.kind !== "none") {
      next.push({ ...it, y: it.y + dy });
      continue;
    }

    const moved: WordBucketCatchFallingItem = { ...it, y: it.y + dy };
    const itemRect: Rect = { x: moved.x, y: moved.y, w: moved.w, h: moved.h };

    if (rectsOverlap(itemRect, catchZone)) {
      result = moved.correct ? { kind: "caught_correct" } : { kind: "caught_wrong" };
      continue;
    }

    if (moved.y + moved.h >= playfieldH) {
      continue;
    }

    next.push(moved);
  }

  return { next, result };
}

/**
 * @param correctChoiceId When set (and `correctImageUrl` is not), correct if `pick.id === correctChoiceId`.
 * @param correctImageUrl When set, correct if trimmed URLs match — use for multi-wave decks so duplicate
 *   choice rows that share the same picture all count as the target.
 *   When both extra args are omitted, uses each choice’s `correct` flag (lesson / legacy deck).
 */
export function randomSpawnItem(
  choices: readonly WordBucketCatchChoice[],
  playfieldW: number,
  itemSize: number,
  rng: () => number,
  correctChoiceId?: string | null,
  correctImageUrl?: string | null,
): WordBucketCatchFallingItem {
  const pick = choices[Math.floor(rng() * choices.length)]!;
  const targetImg =
    correctImageUrl != null && String(correctImageUrl).trim() !== "" ?
      String(correctImageUrl).trim()
    : null;
  const pickedImg = pick.image_url.trim();
  const correct =
    targetImg != null ?
      pickedImg === targetImg
    : correctChoiceId != null && correctChoiceId !== "" ?
      pick.id === correctChoiceId
    : pick.correct;
  const margin = 8;
  const maxX = Math.max(margin, playfieldW - itemSize - margin);
  const x = margin + rng() * (maxX - margin);
  return {
    id: `${pick.id}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    x,
    y: -itemSize,
    w: itemSize,
    h: itemSize,
    correct,
    image_url: pick.image_url,
  };
}
