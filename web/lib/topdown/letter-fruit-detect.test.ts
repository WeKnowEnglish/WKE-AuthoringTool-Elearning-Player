import { describe, expect, it } from "vitest";
import { Jimp } from "jimp";
import { detectBoundsForAtlas, edgeDetectOptionsForAtlas } from "@/lib/topdown/atlas-bounds-snap";
import { LETTER_A_FRUIT_ATLAS } from "@/lib/topdown/letter-fruit-atlas";
import type { SpriteRect } from "@/lib/topdown/types";
import {
  detectLetterFruitStageBoundsAtPoint,
  findLetterFruitLabelBandY,
  letterFruitBoundsPassQualityGate,
  letterFruitColumnArtTopY,
  letterFruitOccupancyScanRect,
  letterFruitStageColumnFromGutters,
  letterFruitStageColumnRectEqual,
  resolveLetterFruitLabelCeilingY,
  scanExpandedLetterFruitContentColumns,
  scanLetterFruitContentColumns,
  unionSpriteRects,
} from "@/lib/topdown/letter-fruit-detect";
import {
  columnsForLetterFruitSheet,
  detectLetterFruitStageBounds,
} from "@/lib/topdown/letter-fruit-autodetect-batch";
import { bboxOfContentInRect, isLetterFruitSheetBackground } from "@/lib/topdown/sprite-edge-detection";

const LETTER_A_SHEET = "public/assets/Letter Fruit Stages/Letter A Stages.png";
const LETTER_E_SHEET = "public/assets/Letter Fruit Stages/Letter E Stages.png";

const LETTER_E_CLICKS = [
  { name: "seed", x: 111, y: 550 },
  { name: "sprout", x: 346, y: 450 },
  { name: "young", x: 614, y: 400 },
  { name: "growing", x: 930, y: 400 },
  { name: "ripe", x: 1299, y: 400 },
] as const;

const STAGE_CLICKS = [
  { name: "seed", x: 153, y: 550 },
  { name: "sprout", x: 460, y: 450 },
  { name: "young", x: 768, y: 400 },
  { name: "growing", x: 1075, y: 400 },
  { name: "ripe", x: 1380, y: 400 },
] as const;

function expectContains(saved: SpriteRect, detected: SpriteRect, tol = 12) {
  expect(detected.sx).toBeLessThanOrEqual(saved.sx + tol);
  expect(detected.sy).toBeLessThanOrEqual(saved.sy + tol);
  expect(detected.sx + detected.sw).toBeGreaterThanOrEqual(saved.sx + saved.sw - tol);
  expect(detected.sy + detected.sh).toBeGreaterThanOrEqual(saved.sy + saved.sh - tol);
}

describe("letter-fruit-detect iteration 1 — gutter columns", () => {
  it("wires letter-fruit atlas detect options", () => {
    expect(edgeDetectOptionsForAtlas("letter-fruit-a")?.maxCellSize).toBe(560);
  });

  it("scans five content columns from art bands on Letter A sheet", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const columns = scanLetterFruitContentColumns(data, width, height);
    expect(columns).toHaveLength(5);
    expect(columns[0]!.sx).toBeLessThan(100);
    expect(columns[4]!.sx + columns[4]!.sw).toBeGreaterThan(1400);
  });

  it("finds non-overlapping gutter columns for stage center clicks", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const columns = STAGE_CLICKS.map((stage) =>
      letterFruitStageColumnFromGutters(data, width, height, stage.x, stage.y),
    );

    expect(columns).toHaveLength(5);
    for (const col of columns) {
      expect(col.sy).toBe(0);
      expect(col.sh).toBe(height);
      expect(col.sw).toBeGreaterThan(60);
    }

    for (let i = 0; i < columns.length - 1; i++) {
      const current = columns[i]!;
      const next = columns[i + 1]!;
      expect(current.sx + current.sw).toBeLessThanOrEqual(next.sx);
    }
  });

  it("growing column is wider than equal-fifths and spans saved art extent", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const growingClick = STAGE_CLICKS.find((s) => s.name === "growing")!;
    const gutterCol = letterFruitStageColumnFromGutters(
      data,
      width,
      height,
      growingClick.x,
      growingClick.y,
    );
    const equalCol = letterFruitStageColumnRectEqual(growingClick.x, width, height);
    void equalCol; // equal fifths kept as fallback reference
    const saved = LETTER_A_FRUIT_ATLAS.assets.letter_a_growing;
    const savedRight = saved.sx + saved.sw;

    expect(gutterCol.sw).toBeGreaterThanOrEqual(280);
    expect(gutterCol.sx).toBeLessThanOrEqual(saved.sx);
    expect(gutterCol.sx + gutterCol.sw).toBeGreaterThanOrEqual(savedRight);
  });

  it("ripe column contains the ripe click and saved crop horizontal span", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const ripeClick = STAGE_CLICKS.find((s) => s.name === "ripe")!;
    const col = letterFruitStageColumnFromGutters(
      data,
      width,
      height,
      ripeClick.x,
      ripeClick.y,
    );
    const saved = LETTER_A_FRUIT_ATLAS.assets.letter_a_ripe;

    expect(ripeClick.x).toBeGreaterThanOrEqual(col.sx);
    expect(ripeClick.x).toBeLessThan(col.sx + col.sw);
    expect(col.sx).toBeLessThanOrEqual(saved.sx);
    expect(col.sx + col.sw).toBeGreaterThanOrEqual(saved.sx + saved.sw);
  });

  it("column widths vary across stages (not fixed 307px fifths)", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const widths = STAGE_CLICKS.map((stage) =>
      letterFruitStageColumnFromGutters(data, width, height, stage.x, stage.y).sw,
    );
    const uniqueWidths = new Set(widths);
    expect(uniqueWidths.size).toBeGreaterThan(1);
    expect(widths.some((w) => w !== 307)).toBe(true);
  });
});

describe("letter-fruit-detect iteration 2 — flood-fill bbox", () => {
  it("detects all five Letter A stages near saved bounds", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    for (const stage of STAGE_CLICKS) {
      const saved = LETTER_A_FRUIT_ATLAS.assets[`letter_a_${stage.name}` as keyof typeof LETTER_A_FRUIT_ATLAS.assets];
      const detected = detectLetterFruitStageBoundsAtPoint(
        data,
        width,
        height,
        stage.x,
        stage.y,
      );
      expect(detected).not.toBeNull();
      expectContains(saved, detected!);
    }
  });

  it("hollow-center clicks return full letter width (not half-A flood crop)", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const hollowClicks = [
      { name: "young", x: 600, y: 500, minSw: 220 },
      { name: "growing", x: 950, y: 450, minSw: 280 },
      { name: "ripe", x: 1320, y: 400, minSw: 330 },
    ] as const;

    for (const click of hollowClicks) {
      const detected = detectLetterFruitStageBoundsAtPoint(
        data,
        width,
        height,
        click.x,
        click.y,
      );
      expect(detected).not.toBeNull();
      expect(detected!.sw).toBeGreaterThanOrEqual(click.minSw);
    }
  });

  it("bounds are stable regardless of click Y within a column", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const growingX = STAGE_CLICKS.find((s) => s.name === "growing")!.x;
    const clicks = [
      { x: growingX, y: 350 },
      { x: growingX, y: 450 },
      { x: growingX, y: 550 },
    ];

    const bounds = clicks.map((c) =>
      detectLetterFruitStageBoundsAtPoint(data, width, height, c.x, c.y),
    );
    expect(bounds.every((b) => b != null)).toBe(true);
    const first = bounds[0]!;
    for (const b of bounds.slice(1)) {
      expect(b).toEqual(first);
    }
  });

  it("wires detectBoundsForAtlas for letter-fruit-a", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    for (const stage of STAGE_CLICKS) {
      const detected = detectBoundsForAtlas(
        "letter-fruit-a",
        data,
        width,
        height,
        stage.x,
        stage.y,
      );
      expect(detected).not.toBeNull();
    }
  });
});

describe("letter-fruit-detect iteration 3 — label band exclusion", () => {
  it("finds the label strip ceiling near y734 on Letter A", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);

    const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
    expect(ceiling).toBeGreaterThanOrEqual(726);
    expect(ceiling).toBeLessThanOrEqual(742);
  });

  it("occupancy scan rect stops above the label strip", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);
    const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
    const ripeCol = columns[4]!;

    const scanRect = letterFruitOccupancyScanRect(ripeCol, ceiling);
    expect(scanRect.sy + scanRect.sh).toBeLessThanOrEqual(ceiling);
    expect(scanRect.sy + scanRect.sh).toBeLessThan(741);
  });

  it("detected bounds stay above the label strip", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    for (const stage of STAGE_CLICKS) {
      const detected = detectLetterFruitStageBoundsAtPoint(
        data,
        width,
        height,
        stage.x,
        stage.y,
      );
      expect(detected).not.toBeNull();
      const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, scanExpandedLetterFruitContentColumns(data, width, height));
      expect(detected!.sy + detected!.sh).toBeLessThanOrEqual(ceiling);
    }
  });

  it("excludes synthetic label rows below art from occupancy bbox", () => {
    const width = 300;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 58;
      data[i + 1] = 58;
      data[i + 2] = 58;
      data[i + 3] = 255;
    }

    function fillRect(x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          const i = (py * width + px) * 4;
          data[i] = rgb[0];
          data[i + 1] = rgb[1];
          data[i + 2] = rgb[2];
        }
      }
    }

    fillRect(40, 40, 80, 80, [200, 80, 60]);
    fillRect(40, 150, 80, 20, [240, 240, 240]);

    const scanRect = { sx: 20, sy: 0, sw: 120, sh: 140 };
    const bbox = bboxOfContentInRect(data, width, height, scanRect, {
      bgTolerance: 32,
      minSize: 8,
    });

    expect(bbox).toEqual({ sx: 40, sy: 40, sw: 80, sh: 80 });
  });

  it("falls back when no multi-column label strip exists", () => {
    const width = 200;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 58;
      data[i + 1] = 58;
      data[i + 2] = 58;
      data[i + 3] = 255;
    }

    const columns = [{ sx: 40, sw: 40 }];
    expect(findLetterFruitLabelBandY(data, width, height, columns)).toBeNull();
  });
});

describe("letter-fruit-detect — Letter E soil ceiling", () => {
  it("ignores the soil baseline and uses a scan ceiling below the text labels", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);

    const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
    expect(ceiling).toBeGreaterThanOrEqual(720);
    expect(ceiling).toBeLessThanOrEqual(742);
    expect(findLetterFruitLabelBandY(data, width, height, columns)).not.toBe(688);
  });

  it("includes the soil mound for seed and sprout stages", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;

    for (const stage of LETTER_E_CLICKS.filter((entry) => entry.name === "seed" || entry.name === "sprout")) {
      const detected = detectLetterFruitStageBoundsAtPoint(
        data,
        width,
        height,
        stage.x,
        stage.y,
      );
      expect(detected).not.toBeNull();
      expect(detected!.sy + detected!.sh).toBeGreaterThanOrEqual(705);
      expect(detected!.sy + detected!.sh).toBeLessThan(740);
    }
  });
});

describe("letter-fruit-detect — dark shadow preservation (step A)", () => {
  it("occupancy bbox on Letter E growing is taller than default gutter distance rule", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);
    const growingCol = columns[3]!;
    const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
    const scanRect = letterFruitOccupancyScanRect(growingCol, ceiling);

    const defaultBbox = bboxOfContentInRect(data, width, height, scanRect, {
      bgTolerance: 42,
      minSize: 8,
    });
    const letterFruitBbox = bboxOfContentInRect(data, width, height, scanRect, {
      bgTolerance: 42,
      minSize: 8,
      isBackground: isLetterFruitSheetBackground,
    });

    expect(defaultBbox).not.toBeNull();
    expect(letterFruitBbox).not.toBeNull();
    expect(letterFruitBbox!.sh).toBeGreaterThan(defaultBbox!.sh);
  });

  it("Letter E ripe crop detects with shadows included", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;

    const detected = detectLetterFruitStageBoundsAtPoint(
      data,
      width,
      height,
      LETTER_E_CLICKS.find((s) => s.name === "ripe")!.x,
      LETTER_E_CLICKS.find((s) => s.name === "ripe")!.y,
    );
    expect(detected).not.toBeNull();
    expect(detected!.sh).toBeGreaterThanOrEqual(480);
  });
});

describe("letter-fruit-detect — occupancy fallback (B3)", () => {
  it("falls back to occupancy when flood crop is too narrow", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;

    const detected = detectLetterFruitStageBoundsAtPoint(data, width, height, 600, 500);
    expect(detected).not.toBeNull();
    expect(detected!.sw).toBeGreaterThanOrEqual(220);
  });

  it("falls back to occupancy when flood misses disconnected soil", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;

    const seed = LETTER_E_CLICKS.find((entry) => entry.name === "seed")!;
    const detected = detectLetterFruitStageBoundsAtPoint(
      data,
      width,
      height,
      seed.x,
      seed.y,
    );
    expect(detected).not.toBeNull();
    expect(detected!.sy + detected!.sh).toBeGreaterThanOrEqual(705);
  });
});

describe("letter-fruit-detect — quality gates (D1)", () => {
  it("Letter E sprout includes the bulb, not just the soil strip", async () => {
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
    expect(detected!.sy).toBeLessThan(520);
    expect(detected!.sh).toBeGreaterThan(180);
  });

  it("Letter E growing and ripe include vine tips at the top", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);
    const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);

    for (const [stageName, colIndex] of [
      ["growing", 3],
      ["ripe", 4],
    ] as const) {
      const stage = LETTER_E_CLICKS.find((entry) => entry.name === stageName)!;
      const column = columns[colIndex]!;
      const artTopY = letterFruitColumnArtTopY(data, width, height, column, ceiling);
      const detected = detectLetterFruitStageBoundsAtPoint(
        data,
        width,
        height,
        stage.x,
        stage.y,
      );
      expect(detected).not.toBeNull();
      expect(detected!.sy).toBeLessThanOrEqual(artTopY + 8);
    }
  });

  it("batch path rejects flood-only soil strips and falls back for E sprout", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = columnsForLetterFruitSheet(data, width, height);
    const sproutColumn = columns[1]!;

    const detected = detectLetterFruitStageBounds(
      data,
      width,
      height,
      sproutColumn,
      "sprout",
    );

    expect(detected).not.toBeNull();
    expect(detected!.sy).toBeLessThan(520);
    expect(detected!.sh).toBeGreaterThan(180);
  });

  it("unionSpriteRects spans disconnected flood and occupancy components", () => {
    const flood = { sx: 100, sy: 600, sw: 200, sh: 100 };
    const occupancy = { sx: 110, sy: 400, sw: 180, sh: 250 };
    const merged = unionSpriteRects(flood, occupancy);
    expect(merged.sx).toBe(100);
    expect(merged.sy).toBe(400);
    expect(merged.sw).toBe(200);
    expect(merged.sh).toBe(300);
  });

  it("letterFruitBoundsPassQualityGate fails on top-clipped soil-only crops", () => {
    const scanRect = { sx: 245, sy: 200, sw: 203, sh: 540 };
    const soilStrip = { sx: 245, sy: 602, sw: 203, sh: 111 };
    const gate = letterFruitBoundsPassQualityGate(soilStrip, scanRect, 480, 710);
    expect(gate).toBe(false);
  });
});

describe("letter-fruit-detect — classifier consistency (D2)", () => {
  it("Letter E label ceiling stays below text labels, not at the soil baseline", async () => {
    const img = await Jimp.read(LETTER_E_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);

    const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
    expect(ceiling).toBeGreaterThanOrEqual(720);
    expect(ceiling).toBeLessThanOrEqual(742);
    expect(findLetterFruitLabelBandY(data, width, height, columns)).not.toBe(688);
  });

  it("Letter A label ceiling is stable with the letter-fruit classifier", async () => {
    const img = await Jimp.read(LETTER_A_SHEET);
    const { data, width, height } = img.bitmap;
    const columns = scanExpandedLetterFruitContentColumns(data, width, height);

    const ceiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
    expect(ceiling).toBeGreaterThanOrEqual(726);
    expect(ceiling).toBeLessThanOrEqual(742);
  });

  it("rejects thick multi-column soil bands as label strips", () => {
    const width = 500;
    const height = 300;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 58;
      data[i + 1] = 58;
      data[i + 2] = 58;
      data[i + 3] = 255;
    }

    const columns = [
      { sx: 0, sw: 100 },
      { sx: 100, sw: 100 },
      { sx: 200, sw: 100 },
      { sx: 300, sw: 100 },
      { sx: 400, sw: 100 },
    ];

    function fillRect(x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          const i = (py * width + px) * 4;
          data[i] = rgb[0];
          data[i + 1] = rgb[1];
          data[i + 2] = rgb[2];
        }
      }
    }

    fillRect(0, 80, 500, 20, [35, 50, 30]);

    expect(findLetterFruitLabelBandY(data, width, height, columns)).toBeNull();

    fillRect(0, 220, 500, 2, [240, 240, 240]);

    expect(findLetterFruitLabelBandY(data, width, height, columns)).toBe(212);
  });
});
