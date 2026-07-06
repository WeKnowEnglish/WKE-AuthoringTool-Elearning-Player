import { join } from "node:path";
import { Jimp } from "jimp";
import {
  columnsForLetterFruitSheet,
  detectLetterFruitStageBounds,
} from "../lib/topdown/letter-fruit-autodetect-batch";
import {
  findLetterFruitLabelBandY,
  letterFruitLabelScanFallbackY,
  letterFruitOccupancyScanRect,
  LETTER_FRUIT_ART_BANDS,
  scanExpandedLetterFruitContentColumns,
} from "../lib/topdown/letter-fruit-detect";
import { LETTER_FRUIT_TUNED_BOUNDS } from "../lib/topdown/letter-fruit-tuned-bounds";
import {
  bboxOfContentInRect,
  estimateBackgroundColor,
  isBackgroundPixel,
} from "../lib/topdown/sprite-edge-detection";

const STAGES = ["seed", "sprout", "young", "growing", "ripe"] as const;

function bottomY(rect: { sy: number; sh: number }) {
  return rect.sy + rect.sh;
}

function contentBottomInColumn(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  col: { sx: number; sw: number },
  y0: number,
  y1: number,
  tolerance = 42,
) {
  const bg = estimateBackgroundColor(data, width, height);
  let maxY = y0;
  for (let y = y1; y >= y0; y--) {
    for (let x = col.sx; x < col.sx + col.sw && x < width; x++) {
      if (!isBackgroundPixel(data, width, x, y, bg, tolerance)) {
        maxY = y;
        return maxY;
      }
    }
  }
  return maxY;
}

async function analyzeLetter(letter: string) {
  const path = join(
    process.cwd(),
    "public/assets/Letter Fruit Stages",
    `Letter ${letter} Stages.png`,
  );
  const img = await Jimp.read(path);
  const { data, width, height } = img.bitmap;

  const columns = columnsForLetterFruitSheet(data, width, height);
  const labelFromSheet = findLetterFruitLabelBandY(data, width, height, columns);
  const labelFallback = letterFruitLabelScanFallbackY(height);

  console.log("Sheet:", width, "x", height);
  console.log("ART_BANDS:", LETTER_FRUIT_ART_BANDS);
  console.log("Columns:", columns);
  console.log("Label band Y (detected):", labelFromSheet);
  console.log("Label band Y (fallback):", labelFallback);
  console.log("Label used:", labelFromSheet ?? labelFallback);
  console.log("");

  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i]!;
    const col = columns[i]!;
    const saved = LETTER_FRUIT_TUNED_BOUNDS[`letter_${letter.toLowerCase()}_${stage}` as keyof typeof LETTER_FRUIT_TUNED_BOUNDS];
    const detected = detectLetterFruitStageBounds(data, width, height, col, stage);
    const labelCeiling = labelFromSheet ?? labelFallback;
    const scanRect = letterFruitOccupancyScanRect(col, labelCeiling);
    const rawBbox = bboxOfContentInRect(data, width, height, scanRect, {
      bgTolerance: 42,
      minSize: stage === "seed" ? 4 : 24,
    });

    const artBottom = contentBottomInColumn(data, width, height, col, 200, height - 1);
    const scanBottom = contentBottomInColumn(
      data,
      width,
      height,
      col,
      scanRect.sy,
      Math.min(scanRect.sy + scanRect.sh - 1, height - 1),
    );

    console.log(`--- ${stage.toUpperCase()} ---`);
    console.log("  column:", col);
    console.log("  scanRect:", scanRect, "bottom:", bottomY(scanRect));
    console.log("  raw bbox:", rawBbox, rawBbox ? `bottom: ${bottomY(rawBbox)}` : "");
    console.log("  detected (saved):", saved, `bottom: ${bottomY(saved)}`);
    console.log("  art bottom in column (full sheet):", artBottom);
    console.log("  art bottom within scan rect:", scanBottom);
    console.log(
      "  soil clipped by (artBottom - cropBottom):",
      artBottom - bottomY(saved),
      "px",
    );
    console.log("");
  }
}

async function main() {
  for (const letter of ["A", "E"]) {
    console.log(`\n========== LETTER ${letter} ==========\n`);
    await analyzeLetter(letter);
  }
}

main().catch(console.error);
