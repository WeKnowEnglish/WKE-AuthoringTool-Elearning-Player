import { Jimp } from "jimp";
import { estimateBackgroundColor, isBackgroundPixel } from "../lib/topdown/sprite-edge-detection";
import { keyOutBorderConnectedGutterInImageData } from "../lib/topdown/gutter-key-sprite";
import { GARDEN_SPRITE_ATLAS } from "../lib/topdown/garden-sprite-atlas";

const SHEET = "public/assets/language_garden_sheet.png";
const TOL = 42;

function cropSheet(sheetData: Uint8ClampedArray, sheetW: number, sx: number, sy: number, sw: number, sh: number) {
  const raw = new Uint8ClampedArray(sw * sh * 4);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = ((sy + y) * sheetW + (sx + x)) * 4;
      const di = (y * sw + x) * 4;
      raw[di] = sheetData[si]!;
      raw[di + 1] = sheetData[si + 1]!;
      raw[di + 2] = sheetData[si + 2]!;
      raw[di + 3] = 255;
    }
  }
  return { data: raw, width: sw, height: sh };
}

function interiorBgComponents(image: { data: Uint8ClampedArray; width: number; height: number }, bg: ReturnType<typeof estimateBackgroundColor>) {
  const { width, height, data } = image;
  const visited = new Uint8Array(width * height);
  const components: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pi = idx * 4;
      if (visited[idx]) continue;
      if (data[pi + 3]! < 12) continue;
      if (!isBackgroundPixel(data, width, x, y, bg, TOL)) continue;

      let size = 0;
      const queue = [x, y];
      visited[idx] = 1;
      while (queue.length > 0) {
        const cy = queue.pop()!;
        const cx = queue.pop()!;
        size++;
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni]) continue;
          if (data[ni * 4 + 3]! < 12) continue;
          if (!isBackgroundPixel(data, width, nx, ny, bg, TOL)) continue;
          visited[ni] = 1;
          queue.push(nx, ny);
        }
      }
      components.push(size);
    }
  }

  components.sort((a, b) => b - a);
  return components;
}

async function main() {
  const img = await Jimp.read(SHEET);
  const { data, width, height } = img.bitmap;
  const bg = estimateBackgroundColor(data, width, height);

  for (const name of ["item_watering_can", "item_fertilizer", "weed_monster"] as const) {
    const b = GARDEN_SPRITE_ATLAS.assets[name];
    const crop = cropSheet(data, width, b.sx, b.sy, b.sw, b.sh);
    const pass1 = { data: new Uint8ClampedArray(crop.data), width: crop.width, height: crop.height };
    keyOutBorderConnectedGutterInImageData(pass1 as ImageData, bg, TOL);
    const comps = interiorBgComponents(pass1, bg);
    const top10 = comps.slice(0, 10);
    const small = comps.filter((c) => c < 50).length;
    const large = comps.filter((c) => c >= 200).length;
    console.log(`\n${name}: ${comps.length} interior bg components`);
    console.log("  top sizes:", top10.join(", "));
    console.log("  components <50px:", small, ">=200px:", large, "total px:", comps.reduce((a, b) => a + b, 0));
  }
}

main();
