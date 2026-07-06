import type { CropGrowthStage } from "@/lib/garden/types";
import {
  getLetterFruitVariant,
  letterFruitAtlasIdForSlug,
  letterFruitImageSrc,
  LETTER_FRUIT_SLUGS,
  type LetterFruitSlug,
} from "@/lib/topdown/letter-fruit-variants";
import { LETTER_FRUIT_TUNED_BOUNDS } from "@/lib/topdown/letter-fruit-tuned-bounds";
import type {
  SpriteAtlasConfig,
  SpriteCategory,
  SpriteFrameDef,
  SpriteRect,
} from "@/lib/topdown/types";

/** Growth art exported as a horizontal strip (5 stages) per letter. */
export const LETTER_FRUIT_STAGE_IDS = [
  "seed",
  "sprout",
  "young",
  "growing",
  "ripe",
] as const;

export type LetterFruitStageId = (typeof LETTER_FRUIT_STAGE_IDS)[number];

export type LetterFruitLetter = string;

export const LETTER_FRUIT_SHEET_WIDTH = 1536;
export const LETTER_FRUIT_SHEET_HEIGHT = 1024;
const LETTER_FRUIT_COLUMN_W = Math.floor(LETTER_FRUIT_SHEET_WIDTH / 5);
const LETTER_FRUIT_CROP_TOP = 40;
const LETTER_FRUIT_CROP_HEIGHT = 740;

function defaultColumnBounds(columnIndex: number): SpriteRect {
  const sx = columnIndex * LETTER_FRUIT_COLUMN_W;
  const sw =
    columnIndex === 4 ? LETTER_FRUIT_SHEET_WIDTH - sx : LETTER_FRUIT_COLUMN_W;
  return {
    sx,
    sy: LETTER_FRUIT_CROP_TOP,
    sw,
    sh: LETTER_FRUIT_CROP_HEIGHT,
  };
}

export function letterFruitAssetKey(
  slug: LetterFruitSlug,
  stage: LetterFruitStageId,
): LetterFruitAssetKey {
  return `letter_${slug}_${stage}`;
}

export type LetterFruitAssetKey = `letter_${LetterFruitSlug}_${LetterFruitStageId}`;

/** @deprecated Use LetterFruitAssetKey */
export type LetterAFruitAssetKey = Extract<LetterFruitAssetKey, `letter_a_${LetterFruitStageId}`>;

/** @deprecated Use letterFruitAssetKey("a", stage) */
export type LetterAFruitAssetId = LetterAFruitAssetKey;

function tunedBoundsForSlug(slug: LetterFruitSlug): Record<string, SpriteRect> {
  const tuned: Record<string, SpriteRect> = {};
  for (const stage of LETTER_FRUIT_STAGE_IDS) {
    const key = letterFruitAssetKey(slug, stage);
    if (key in LETTER_FRUIT_TUNED_BOUNDS) {
      tuned[key] = { ...LETTER_FRUIT_TUNED_BOUNDS[key as LetterFruitAssetKey] };
    }
  }
  return tuned;
}

function defaultAssetsForSlug(slug: LetterFruitSlug): Record<string, SpriteRect> {
  return Object.fromEntries(
    LETTER_FRUIT_STAGE_IDS.map((stage, index) => [
      letterFruitAssetKey(slug, stage),
      defaultColumnBounds(index),
    ]),
  );
}

function buildAtlasForSlug(slug: LetterFruitSlug): SpriteAtlasConfig {
  const assets = {
    ...defaultAssetsForSlug(slug),
    ...tunedBoundsForSlug(slug),
  };

  return {
    imageSrc: letterFruitImageSrc(slug),
    width: LETTER_FRUIT_SHEET_WIDTH,
    height: LETTER_FRUIT_SHEET_HEIGHT,
    assets,
  };
}

export const LETTER_FRUIT_ATLASES: Record<LetterFruitSlug, SpriteAtlasConfig> =
  Object.fromEntries(
    LETTER_FRUIT_SLUGS.map((slug) => [slug, buildAtlasForSlug(slug)]),
  ) as Record<LetterFruitSlug, SpriteAtlasConfig>;

export const LETTER_A_FRUIT_ATLAS = LETTER_FRUIT_ATLASES.a;

export function getLetterFruitAtlas(slug: LetterFruitSlug): SpriteAtlasConfig {
  return LETTER_FRUIT_ATLASES[slug];
}

export function getLetterFruitAtlasId(slug: LetterFruitSlug): string {
  return letterFruitAtlasIdForSlug(slug);
}

export function listLetterFruitAssetIds(
  slug: LetterFruitSlug,
): readonly LetterFruitAssetKey[] {
  return LETTER_FRUIT_STAGE_IDS.map((stage) => letterFruitAssetKey(slug, stage));
}

/** @deprecated Use listLetterFruitAssetIds("a") */
export function listLetterAFruitAssetIds(): readonly LetterAFruitAssetKey[] {
  return listLetterFruitAssetIds("a") as readonly LetterAFruitAssetKey[];
}

export const LETTER_A_FRUIT_ASSET_IDS = listLetterAFruitAssetIds();

const STAGE_LABELS: Record<LetterFruitStageId, string> = {
  seed: "Seed",
  sprout: "Sprout",
  young: "Young",
  growing: "Growing",
  ripe: "Ripe",
};

const STAGE_PLOT_HINTS: Record<LetterFruitStageId, string> = {
  seed: "Seed on soil — planted band",
  sprout: "Sprout mound — early growth",
  young: "Letter forming — mid growth",
  growing: "Thick letter vine — late growth",
  ripe: "Harvest-ready letter fruit",
};

const STAGE_SUFFIXES = [...LETTER_FRUIT_STAGE_IDS].sort(
  (a, b) => b.length - a.length,
);

export function parseLetterFruitAssetKey(assetKey: string): {
  slug: LetterFruitSlug;
  stage: LetterFruitStageId;
} {
  for (const stage of STAGE_SUFFIXES) {
    const suffix = `_${stage}`;
    if (assetKey.endsWith(suffix) && assetKey.startsWith("letter_")) {
      const slug = assetKey.slice("letter_".length, -suffix.length) as LetterFruitSlug;
      if (!LETTER_FRUIT_SLUGS.includes(slug)) {
        break;
      }
      return { slug, stage };
    }
  }
  throw new Error(`Invalid letter fruit asset key: ${assetKey}`);
}

function frameDef(slug: LetterFruitSlug, stage: LetterFruitStageId): SpriteFrameDef {
  const variant = getLetterFruitVariant(slug);
  const id = letterFruitAssetKey(slug, stage);
  const atlas = getLetterFruitAtlas(slug);
  return {
    id,
    label: `${variant.label} — ${STAGE_LABELS[stage]}`,
    category: "plant" as SpriteCategory,
    ...atlas.assets[id],
  };
}

export function letterFruitFrames(slug: LetterFruitSlug): readonly SpriteFrameDef[] {
  return LETTER_FRUIT_STAGE_IDS.map((stage) => frameDef(slug, stage));
}

export function letterFruitFrameByStage(
  slug: LetterFruitSlug,
): Record<LetterFruitStageId, SpriteFrameDef> {
  return Object.fromEntries(
    LETTER_FRUIT_STAGE_IDS.map((stage) => [stage, frameDef(slug, stage)]),
  ) as Record<LetterFruitStageId, SpriteFrameDef>;
}

/** @deprecated Use letterFruitFrames("a") */
export const LETTER_A_FRUIT_FRAMES = letterFruitFrames("a");

/** @deprecated Use letterFruitFrameByStage("a") */
export const LETTER_A_FRUIT_FRAME_BY_STAGE = letterFruitFrameByStage("a");

export function letterFruitStageForGrowth(
  stage: CropGrowthStage,
  progress: number,
): LetterFruitStageId | null {
  if (stage === "empty") return null;
  if (stage === "ready") return "ripe";
  if (stage === "growing") {
    return progress >= 0.85 ? "growing" : "young";
  }
  if (progress < 0.12) return "seed";
  if (progress < 0.45) return "sprout";
  return "young";
}

export function letterFruitStagePlotHint(stage: LetterFruitStageId): string {
  return STAGE_PLOT_HINTS[stage];
}

export function getLetterFruitBounds(
  slug: LetterFruitSlug,
  stage: LetterFruitStageId,
): SpriteRect {
  const atlas = getLetterFruitAtlas(slug);
  const key = letterFruitAssetKey(slug, stage);
  return { ...atlas.assets[key] };
}

/** @deprecated Use getLetterFruitBounds("a", stage) */
export function getLetterAFruitBounds(stage: LetterFruitStageId): SpriteRect {
  return getLetterFruitBounds("a", stage);
}
