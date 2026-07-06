import { Jimp } from "jimp";
import {
  estimateBackgroundColor,
  isBackgroundPixel,
  colorDistance,
} from "../lib/topdown/sprite-edge-detection";
import {
  keyOutBorderConnectedGutterInImageData,
  keyOutInteriorGutterHolesInImageData,
} from "../lib/topdown/gutter-key-sprite";
import { LETTER_A_FRUIT_ATLAS } from "../lib/topdown/letter-fruit-atlas";

const SHEET = "public/assets/Letter Fruit Stages/Letter A Stages.png";
const TOL = 42;

const STAGES = [
  "letter_a_young",
  "letter_a_growing",
  "letter_a_ripe",
] as const;

function cloneImageData(data: Uint8ClampedArray, w: number, h: number): ImageData {
  return { data: new Uint8ClampedArray(data), width: w, height: h } as ImageData;
}

async function main() {
  const img = await Jimp.read(SHEET);
  const { data: sheetData, width: sheetW, height: sheetH } = img.bitmap;
  const bg = estimateBackgroundColor(sheetData, sheetW, sheetH);
  console.log("letter fruit bg", bg);

  for (const key of STAGES) {
    const bounds = LETTER_A_FRUIT_ATLAS.assets[key];
    const { sx, sy, sw, sh } = bounds;
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

    const pass1 = cloneImageData(raw, sw, sh);
    keyOutBorderConnectedGutterInImageData(pass1, bg, TOL);
    const full = cloneImageData(pass1.data, sw, sh);
    keyOutInteriorGutterHolesInImageData(full, bg, TOL);

    let pass2Removed = 0;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const pi = (y * sw + x) * 4;
        if (pass1.data[pi + 3]! >= 12 && full.data[pi + 3]! < 12) pass2Removed++;
      }
    }
    console.log(key, `${sw}x${sh}`, "pass2 removed:", pass2Removed);
  }
}

main();
