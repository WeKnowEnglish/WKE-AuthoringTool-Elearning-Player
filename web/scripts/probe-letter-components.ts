import { Jimp } from "jimp";
import { estimateBackgroundColor, isBackgroundPixel } from "../lib/topdown/sprite-edge-detection";
import { keyOutBorderConnectedGutterInImageData } from "../lib/topdown/gutter-key-sprite";
import { LETTER_A_FRUIT_ATLAS } from "../lib/topdown/letter-fruit-atlas";

const SHEET = "public/assets/Letter Fruit Stages/Letter A Stages.png";
const TOL = 42;

function cropAndPass1(sheetData: Uint8ClampedArray, sheetW: number, sx: number, sy: number, sw: number, sh: number, bg: ReturnType<typeof estimateBackgroundColor>) {
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
  const pass1 = { data: raw, width: sw, height: sh } as ImageData;
  keyOutBorderConnectedGutterInImageData(pass1, bg, TOL);
  return pass1;
}

function interiorBgComponents(image: ImageData, bg: ReturnType<typeof estimateBackgroundColor>) {
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

  for (const name of ["letter_a_seed", "letter_a_young", "letter_a_ripe"] as const) {
    const b = LETTER_A_FRUIT_ATLAS.assets[name];
    const pass1 = cropAndPass1(data, width, b.sx, b.sy, b.sw, b.sh, bg);
    const comps = interiorBgComponents(pass1, bg);
    console.log(name, "top:", comps.slice(0, 5).join(", "), "count<50:", comps.filter((c) => c < 50).length);
  }
}

main();
