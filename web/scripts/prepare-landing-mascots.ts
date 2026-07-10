/**
 * One-time prep: key out studio white backgrounds from landing mascots and write
 * transparent PNGs to public/landing/.
 *
 * Usage: npm run prepare:landing-mascots
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Jimp } from "jimp";
import {
  colorDistance,
  estimateBackgroundColor,
  type Rgb,
} from "../lib/topdown/sprite-edge-detection";

const ASSETS_DIR = join(process.cwd(), "public", "assets");
const OUTPUT_DIR = join(process.cwd(), "public", "landing");

const SOURCES = [
  {
    input: join(ASSETS_DIR, "Mascot girl for landing page.png"),
    output: join(OUTPUT_DIR, "primary-mascot.png"),
    label: "Primary (girl)",
  },
  {
    input: join(ASSETS_DIR, "Mascot Boy  for landing page.png"),
    output: join(OUTPUT_DIR, "secondary-mascot.png"),
    label: "Secondary (boy)",
  },
] as const;

const BG_TOLERANCE = 32;
const EDGE_SOFTNESS = 10;
const MAX_OUTPUT_WIDTH = 400;
const ALPHA_CROP_THRESHOLD = 12;

function isBackgroundRgb(r: number, g: number, b: number, bg: Rgb, tolerance: number): boolean {
  return colorDistance(bg, r, g, b) <= tolerance;
}

function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

/** Flood-fill background from image edges so interior whites (shoes, stripes) stay opaque. */
function keyOutEdgeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: Rgb,
  tolerance: number,
): Uint8Array {
  const isBg = new Uint8Array(width * height);
  const queue: number[] = [];

  const tryEnqueue = (x: number, y: number) => {
    const idx = y * width + x;
    if (isBg[idx]) return;
    const i = pixelIndex(width, x, y);
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (!isBackgroundRgb(r, g, b, bg, tolerance)) return;
    isBg[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) tryEnqueue(x - 1, y);
    if (x < width - 1) tryEnqueue(x + 1, y);
    if (y > 0) tryEnqueue(x, y - 1);
    if (y < height - 1) tryEnqueue(x, y + 1);
  }

  return isBg;
}

function softenEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  isBg: Uint8Array,
  bg: Rgb,
  tolerance: number,
  edgeSoftness: number,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isBg[idx]) {
        const i = pixelIndex(width, x, y);
        data[i + 3] = 0;
        continue;
      }

      let touchesBg = false;
      for (let dy = -1; dy <= 1 && !touchesBg; dy++) {
        for (let dx = -1; dx <= 1 && !touchesBg; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            touchesBg = true;
            continue;
          }
          if (isBg[ny * width + nx]) touchesBg = true;
        }
      }

      if (!touchesBg) continue;

      const i = pixelIndex(width, x, y);
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const dist = colorDistance(bg, r, g, b);
      if (dist <= tolerance + edgeSoftness) {
        const t = Math.max(0, Math.min(1, (dist - tolerance) / edgeSoftness));
        data[i + 3] = Math.round(t * 255);
      }
    }
  }
}

function trimBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): { x: number; y: number; w: number; h: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[pixelIndex(width, x, y) + 3]!;
      if (alpha < alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function processMascot(source: (typeof SOURCES)[number]) {
  const img = await Jimp.read(source.input);
  const { data, width, height } = img.bitmap;
  const bg = estimateBackgroundColor(data, width, height);

  const isBg = keyOutEdgeBackground(data, width, height, bg, BG_TOLERANCE);
  softenEdges(data, width, height, isBg, bg, BG_TOLERANCE, EDGE_SOFTNESS);

  const bounds = trimBounds(data, width, height, ALPHA_CROP_THRESHOLD);
  if (!bounds) {
    throw new Error(`${source.label}: no opaque pixels after key-out`);
  }

  const cropped = img.crop({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });

  if (cropped.bitmap.width > MAX_OUTPUT_WIDTH) {
    cropped.scale({ f: MAX_OUTPUT_WIDTH / cropped.bitmap.width });
  }

  await cropped.write(source.output as `${string}.${string}`);
  return {
    label: source.label,
    output: source.output,
    size: `${cropped.bitmap.width}x${cropped.bitmap.height}`,
    bg,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const source of SOURCES) {
    const result = await processMascot(source);
    console.log(
      `${result.label}: bg≈rgb(${result.bg.r.toFixed(0)},${result.bg.g.toFixed(0)},${result.bg.b.toFixed(0)}) → ${result.output} (${result.size})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
