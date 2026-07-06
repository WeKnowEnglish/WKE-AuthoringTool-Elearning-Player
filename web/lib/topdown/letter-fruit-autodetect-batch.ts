import {
  detectLetterFruitStageBoundsAtPoint,
  LETTER_FRUIT_STAGE_COLUMN_COUNT,
  letterFruitBoundsPassQualityGate,
  letterFruitColumnArtBottomY,
  letterFruitColumnArtTopY,
  letterFruitOccupancyScanRect,
  occupancyBboxInScanRect,
  resolveLetterFruitLabelCeilingY,
  scanExpandedLetterFruitContentColumns,
} from "@/lib/topdown/letter-fruit-detect";
import {
  LETTER_FRUIT_VARIANTS,
  type LetterFruitSlug,
} from "@/lib/topdown/letter-fruit-variants";
import type { SpriteRect } from "@/lib/topdown/types";

export const LETTER_FRUIT_STAGE_IDS = [
  "seed",
  "sprout",
  "young",
  "growing",
  "ripe",
] as const;

export type LetterFruitStageId = (typeof LETTER_FRUIT_STAGE_IDS)[number];

export type LetterFruitAssetKey = `letter_${LetterFruitSlug}_${LetterFruitStageId}`;

export function letterFruitAssetKey(
  slug: LetterFruitSlug,
  stage: LetterFruitStageId,
): LetterFruitAssetKey {
  return `letter_${slug}_${stage}`;
}

const STAGE_CLICK_Y: Record<LetterFruitStageId, number> = {
  seed: 550,
  sprout: 450,
  young: 400,
  growing: 400,
  ripe: 400,
};

const RETRY_CLICK_Y = [500, 600, 350, 300, 450, 550, 650, 680, 620, 700];

export type LetterFruitContentColumn = { sx: number; sw: number };

export function columnsForLetterFruitSheet(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): LetterFruitContentColumn[] {
  const columns = scanExpandedLetterFruitContentColumns(data, width, height);
  if (columns.length === LETTER_FRUIT_STAGE_COLUMN_COUNT) {
    return columns;
  }

  const colW = Math.floor(width / LETTER_FRUIT_STAGE_COLUMN_COUNT);
  return LETTER_FRUIT_STAGE_IDS.map((_, index) => {
    const sx = index * colW;
    const sw =
      index === LETTER_FRUIT_STAGE_COLUMN_COUNT - 1 ? width - sx : colW;
    return { sx, sw };
  });
}

export function clickPointForLetterFruitStage(
  column: LetterFruitContentColumn,
  stage: LetterFruitStageId,
): { x: number; y: number } {
  return {
    x: Math.floor(column.sx + column.sw / 2),
    y: STAGE_CLICK_Y[stage],
  };
}

export function detectLetterFruitStageBoundsRelaxed(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: LetterFruitContentColumn,
  labelCeilingY: number,
  stage: LetterFruitStageId,
): SpriteRect | null {
  const scanRect = letterFruitOccupancyScanRect(column, labelCeilingY);
  const minSize = stage === "seed" ? 4 : undefined;
  return occupancyBboxInScanRect(data, width, height, scanRect, { minSize });
}

export function detectLetterFruitStageBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: LetterFruitContentColumn,
  stage: LetterFruitStageId,
): SpriteRect | null {
  const columns = columnsForLetterFruitSheet(data, width, height);
  const labelCeiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
  const scanRect = letterFruitOccupancyScanRect(column, labelCeiling);
  const artTopY = letterFruitColumnArtTopY(data, width, height, column, labelCeiling);
  const artBottomY = letterFruitColumnArtBottomY(data, width, height, column, labelCeiling);

  const acceptDetect = (bounds: SpriteRect | null): SpriteRect | null => {
    if (!bounds) return null;
    return letterFruitBoundsPassQualityGate(bounds, scanRect, artTopY, artBottomY) ? bounds : null;
  };

  const { x, y } = clickPointForLetterFruitStage(column, stage);
  let detected = acceptDetect(detectLetterFruitStageBoundsAtPoint(data, width, height, x, y));
  if (detected) return detected;

  for (const altY of RETRY_CLICK_Y) {
    if (altY === y) continue;
    detected = acceptDetect(detectLetterFruitStageBoundsAtPoint(data, width, height, x, altY));
    if (detected) return detected;
  }

  return detectLetterFruitStageBoundsRelaxed(
    data,
    width,
    height,
    column,
    labelCeiling,
    stage,
  );
}

export type LetterFruitSheetDetectResult = {
  slug: LetterFruitSlug;
  imageFile: string;
  bounds: Partial<Record<LetterFruitAssetKey, SpriteRect>>;
  failures: LetterFruitStageId[];
};

export function detectLetterFruitBoundsForSheet(
  slug: LetterFruitSlug,
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Omit<LetterFruitSheetDetectResult, "imageFile"> {
  const columns = columnsForLetterFruitSheet(data, width, height);
  const bounds: Partial<Record<LetterFruitAssetKey, SpriteRect>> = {};
  const failures: LetterFruitStageId[] = [];

  for (let index = 0; index < LETTER_FRUIT_STAGE_IDS.length; index++) {
    const stage = LETTER_FRUIT_STAGE_IDS[index]!;
    const column = columns[index]!;
    const detected = detectLetterFruitStageBounds(data, width, height, column, stage);
    const assetKey = letterFruitAssetKey(slug, stage);

    if (detected) {
      bounds[assetKey] = detected;
    } else {
      failures.push(stage);
    }
  }

  return { slug, bounds, failures };
}

export function renderLetterFruitTunedBoundsSource(
  allBounds: Record<LetterFruitAssetKey, SpriteRect>,
): string {
  const lines = Object.entries(allBounds).map(
    ([assetKey, rect]) =>
      `  ${assetKey}: { sx: ${rect.sx}, sy: ${rect.sy}, sw: ${rect.sw}, sh: ${rect.sh} },`,
  );

  return `/** Auto-detected letter fruit crop bounds — generated by scripts/autodetect-letter-fruit-bounds.ts */
import type { LetterFruitAssetKey } from "@/lib/topdown/letter-fruit-atlas";
import type { SpriteRect } from "@/lib/topdown/types";

export const LETTER_FRUIT_TUNED_BOUNDS = {
${lines.join("\n")}
} as const satisfies Record<LetterFruitAssetKey, SpriteRect>;
`;
}

export const LETTER_FRUIT_VARIANT_IMAGE_FILES = Object.fromEntries(
  LETTER_FRUIT_VARIANTS.map((variant) => [variant.slug, variant.imageFile]),
) as Record<LetterFruitSlug, string>;
