import { describe, expect, it } from "vitest";
import { Jimp } from "jimp";
import {
  detectLetterFruitBoundsForSheet,
  LETTER_FRUIT_STAGE_IDS,
} from "@/lib/topdown/letter-fruit-autodetect-batch";
import {
  detectLetterFruitStageBoundsAtPoint,
  letterFruitBoundsPassQualityGate,
  letterFruitColumnArtBottomY,
  letterFruitColumnArtTopY,
  letterFruitOccupancyScanRect,
  occupancyBboxInScanRect,
  resolveLetterFruitLabelCeilingY,
  scanExpandedLetterFruitContentColumns,
} from "@/lib/topdown/letter-fruit-detect";
import {
  keyOutGutterInImageData,
  LETTER_FRUIT_GUTTER_KEY_OPTIONS,
} from "@/lib/topdown/gutter-key-sprite";
import { estimateBackgroundColor } from "@/lib/topdown/sprite-edge-detection";
import type { SpriteRect } from "@/lib/topdown/types";

const LETTER_A_SHEET = "public/assets/Letter Fruit Stages/Letter A Stages.png";
const LETTER_E_SHEET = "public/assets/Letter Fruit Stages/Letter E Stages.png";

/** B5 regression — E sprout soil-only strip that D1 must beat. */
const B5_E_SPROUT_SOIL_STRIP: SpriteRect = { sx: 245, sy: 602, sw: 203, sh: 111 };

const LETTER_A_CLICKS = [
  { name: "seed", x: 153, y: 550 },
  { name: "sprout", x: 460, y: 450 },
  { name: "young", x: 768, y: 400 },
  { name: "growing", x: 1075, y: 400 },
  { name: "ripe", x: 1380, y: 400 },
] as const;

const LETTER_E_CLICKS = [
  { name: "seed", x: 111, y: 550 },
  { name: "sprout", x: 346, y: 450 },
  { name: "young", x: 614, y: 400 },
  { name: "growing", x: 930, y: 400 },
  { name: "ripe", x: 1299, y: 400 },
] as const;

function assertLetterFruitBoundsContract(
  detected: SpriteRect,
  scanRect: SpriteRect,
  artTopY: number,
  artBottomY: number,
  labelCeilingY: number,
) {
  expect(letterFruitBoundsPassQualityGate(detected, scanRect, artTopY, artBottomY)).toBe(true);
  expect(detected.sy).toBeLessThanOrEqual(artTopY + 8);
  expect(detected.sy + detected.sh).toBeGreaterThanOrEqual(artBottomY - 8);
  expect(detected.sy + detected.sh).toBeLessThanOrEqual(labelCeilingY);
  expect(detected.sw).toBeGreaterThanOrEqual(scanRect.sw * 0.55);
}

function rectContains(outer: SpriteRect, inner: SpriteRect): boolean {
  return (
    outer.sx <= inner.sx &&
    outer.sy <= inner.sy &&
    outer.sx + outer.sw >= inner.sx + inner.sw &&
    outer.sy + outer.sh >= inner.sy + inner.sh
  );
}

function countOpaquePixels(image: ImageData): number {
  let count = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i]! >= 12) count++;
  }
  return count;
}

function cropToImageData(
  data: Uint8ClampedArray,
  sheetWidth: number,
  bounds: SpriteRect,
): ImageData {
  const crop = new Uint8ClampedArray(bounds.sw * bounds.sh * 4);
  for (let y = 0; y < bounds.sh; y++) {
    for (let x = 0; x < bounds.sw; x++) {
      const src = ((bounds.sy + y) * sheetWidth + (bounds.sx + x)) * 4;
      const dst = (y * bounds.sw + x) * 4;
      crop[dst] = data[src]!;
      crop[dst + 1] = data[src + 1]!;
      crop[dst + 2] = data[src + 2]!;
      crop[dst + 3] = data[src + 3]!;
    }
  }
  return { data: crop, width: bounds.sw, height: bounds.sh } as ImageData;
}

async function assertSheetStagesMeetContract(
  sheetPath: string,
  clicks: readonly { name: string; x: number; y: number }[],
) {
  const img = await Jimp.read(sheetPath);
  const { data, width, height } = img.bitmap;
  const columns = scanExpandedLetterFruitContentColumns(data, width, height);
  const labelCeiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);

  for (let index = 0; index < LETTER_FRUIT_STAGE_IDS.length; index++) {
    const stage = LETTER_FRUIT_STAGE_IDS[index]!;
    const column = columns[index]!;
    const click = clicks.find((entry) => entry.name === stage)!;
    const scanRect = letterFruitOccupancyScanRect(column, labelCeiling);
    const artTopY = letterFruitColumnArtTopY(data, width, height, column, labelCeiling);
    const artBottomY = letterFruitColumnArtBottomY(data, width, height, column, labelCeiling);

    const detected = detectLetterFruitStageBoundsAtPoint(
      data,
      width,
      height,
      click.x,
      click.y,
    );

    expect(detected, `missing detect for ${stage}`).not.toBeNull();
    assertLetterFruitBoundsContract(
      detected!,
      scanRect,
      artTopY,
      artBottomY,
      labelCeiling,
    );
  }
}

describe("letter-fruit-detect — bounds contract (D3)", () => {
  it("every Letter E stage satisfies the detection contract", async () => {
    await assertSheetStagesMeetContract(LETTER_E_SHEET, LETTER_E_CLICKS);
  });

  it("every Letter A stage satisfies the detection contract", async () => {
    await assertSheetStagesMeetContract(LETTER_A_SHEET, LETTER_A_CLICKS);
  });

  it("Letter E sprout occupancy reaches the bulb above the B5 soil strip", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);
    const sproutColumn = columns[1]!;
    const labelCeiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
    const scanRect = letterFruitOccupancyScanRect(sproutColumn, labelCeiling);

    const occupancy = occupancyBboxInScanRect(data, width, height, scanRect);
    expect(occupancy).not.toBeNull();
    expect(occupancy!.sy).toBeLessThan(B5_E_SPROUT_SOIL_STRIP.sy);

    const sprout = LETTER_E_CLICKS.find((entry) => entry.name === "sprout")!;
    const detected = detectLetterFruitStageBoundsAtPoint(
      data,
      width,
      height,
      sprout.x,
      sprout.y,
    );
    expect(detected).not.toBeNull();
    expect(rectContains(detected!, occupancy!)).toBe(true);
    expect(detected!.sy).toBeLessThan(B5_E_SPROUT_SOIL_STRIP.sy);
  });

  it("batch detect for Letter E produces all five stages with no failures", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;

    const result = detectLetterFruitBoundsForSheet("e", data, width, height);
    expect(result.failures).toEqual([]);
    expect(Object.keys(result.bounds)).toHaveLength(5);

    const columns = scanExpandedLetterFruitContentColumns(data, width, height);
    const labelCeiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);

    for (let index = 0; index < LETTER_FRUIT_STAGE_IDS.length; index++) {
      const stage = LETTER_FRUIT_STAGE_IDS[index]!;
      const column = columns[index]!;
      const bounds = result.bounds[`letter_e_${stage}` as keyof typeof result.bounds];
      expect(bounds, `missing batch bounds for ${stage}`).toBeDefined();

      const scanRect = letterFruitOccupancyScanRect(column, labelCeiling);
      const artTopY = letterFruitColumnArtTopY(data, width, height, column, labelCeiling);
      const artBottomY = letterFruitColumnArtBottomY(data, width, height, column, labelCeiling);
      assertLetterFruitBoundsContract(bounds!, scanRect, artTopY, artBottomY, labelCeiling);
    }
  });

  it("batch detect for Letter A produces all five stages with no failures", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const result = detectLetterFruitBoundsForSheet("a", data, width, height);
    expect(result.failures).toEqual([]);
    expect(Object.keys(result.bounds)).toHaveLength(5);
  });

  it("knockout handoff retains meaningful art for Letter E sprout crops", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;
    const sprout = LETTER_E_CLICKS.find((entry) => entry.name === "sprout")!;
    const detected = detectLetterFruitStageBoundsAtPoint(
      data,
      width,
      height,
      sprout.x,
      sprout.y,
    );
    expect(detected).not.toBeNull();

    const crop = cropToImageData(data, width, detected!);
    const beforeOpaque = countOpaquePixels(crop);
    const bg = estimateBackgroundColor(data, width, height);

    keyOutGutterInImageData(crop, bg, 42, LETTER_FRUIT_GUTTER_KEY_OPTIONS);

    const afterOpaque = countOpaquePixels(crop);
    expect(beforeOpaque).toBeGreaterThan(8_000);
    expect(afterOpaque).toBeGreaterThan(5_000);
    expect(afterOpaque).toBeLessThan(beforeOpaque);
  });
});
