/**
 * Batch auto-detect crop bounds for every letter fruit sheet × growth stage.
 * Writes lib/topdown/letter-fruit-tuned-bounds.ts
 *
 * Usage: npx tsx scripts/autodetect-letter-fruit-bounds.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Jimp } from "jimp";
import {
  detectLetterFruitBoundsForSheet,
  renderLetterFruitTunedBoundsSource,
  type LetterFruitAssetKey,
  type LetterFruitSheetDetectResult,
} from "../lib/topdown/letter-fruit-autodetect-batch";
import {
  LETTER_FRUIT_VARIANTS,
  type LetterFruitSlug,
} from "../lib/topdown/letter-fruit-variants";
import type { SpriteRect } from "../lib/topdown/types";

const ASSETS_DIR = join(process.cwd(), "public", "assets", "Letter Fruit Stages");
const OUTPUT_PATH = join(process.cwd(), "lib", "topdown", "letter-fruit-tuned-bounds.ts");

async function detectVariant(slug: LetterFruitSlug, imageFile: string) {
  const path = join(ASSETS_DIR, imageFile);
  const img = await Jimp.read(path);
  const { data, width, height } = img.bitmap;
  const result = detectLetterFruitBoundsForSheet(slug, data, width, height);
  return { ...result, imageFile } satisfies LetterFruitSheetDetectResult;
}

async function main() {
  const allBounds = {} as Record<LetterFruitAssetKey, SpriteRect>;
  const sheetResults: LetterFruitSheetDetectResult[] = [];

  for (const variant of LETTER_FRUIT_VARIANTS) {
    process.stdout.write(`Detecting ${variant.label}… `);
    const result = await detectVariant(variant.slug, variant.imageFile);
    sheetResults.push(result);

    const detectedCount = Object.keys(result.bounds).length;
    const failText =
      result.failures.length > 0 ? ` (${result.failures.join(", ")} failed)` : "";
    console.log(`${detectedCount}/5${failText}`);

    for (const [assetKey, bounds] of Object.entries(result.bounds)) {
      allBounds[assetKey as LetterFruitAssetKey] = bounds;
    }
  }

  const expected = LETTER_FRUIT_VARIANTS.length * 5;
  const actual = Object.keys(allBounds).length;
  if (actual < expected) {
    console.warn(`\nWarning: only ${actual}/${expected} stages detected.`);
    for (const result of sheetResults) {
      if (result.failures.length > 0) {
        console.warn(`  ${result.slug}: ${result.failures.join(", ")}`);
      }
    }
    process.exitCode = 1;
  }

  const source = renderLetterFruitTunedBoundsSource(allBounds);
  writeFileSync(OUTPUT_PATH, source, "utf8");
  console.log(`\nWrote ${actual} bounds to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
