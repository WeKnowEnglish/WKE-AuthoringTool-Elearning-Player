import { Jimp } from "jimp";
import { estimateBackgroundColor } from "../lib/topdown/sprite-edge-detection";
import {
  keyOutBorderConnectedGutterInImageData,
  keyOutInteriorGutterHolesInImageData,
} from "../lib/topdown/gutter-key-sprite";
import { GARDEN_SPRITE_ATLAS } from "../lib/topdown/garden-sprite-atlas";
import { LETTER_A_FRUIT_ATLAS } from "../lib/topdown/letter-fruit-atlas";

const GARDEN_SHEET = "public/assets/language_garden_sheet.png";
const LETTER_SHEET = "public/assets/Letter Fruit Stages/Letter A Stages.png";

function cropSheet(
  sheetData: Uint8ClampedArray,
  sheetW: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): ImageData {
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
  return { data: raw, width: sw, height: sh } as ImageData;
}

function countPass2Removed(pass1: ImageData, bg: ReturnType<typeof estimateBackgroundColor>, tol: number) {
  const pass2 = { data: new Uint8ClampedArray(pass1.data), width: pass1.width, height: pass1.height } as ImageData;
  keyOutInteriorGutterHolesInImageData(pass2, bg, tol);
  let n = 0;
  for (let i = 3; i < pass1.data.length; i += 4) {
    if (pass1.data[i]! >= 12 && pass2.data[i]! < 12) n++;
  }
  return n;
}

async function main() {
  for (const strictTol of [42, 24, 18, 12, 8]) {
    console.log(`\n--- pass2 tolerance ${strictTol} ---`);

    const gardenImg = await Jimp.read(GARDEN_SHEET);
    const gBg = estimateBackgroundColor(gardenImg.bitmap.data, gardenImg.bitmap.width, gardenImg.bitmap.height);
    for (const name of ["item_watering_can", "item_fertilizer", "weed_monster"] as const) {
      const b = GARDEN_SPRITE_ATLAS.assets[name];
      const crop = cropSheet(gardenImg.bitmap.data, gardenImg.bitmap.width, b.sx, b.sy, b.sw, b.sh);
      const pass1 = { data: new Uint8ClampedArray(crop.data), width: crop.width, height: crop.height } as ImageData;
      keyOutBorderConnectedGutterInImageData(pass1, gBg, 42);
      console.log("garden", name, "removed", countPass2Removed(pass1, gBg, strictTol));
    }

    const letterImg = await Jimp.read(LETTER_SHEET);
    const lBg = estimateBackgroundColor(letterImg.bitmap.data, letterImg.bitmap.width, letterImg.bitmap.height);
    for (const name of ["letter_a_young", "letter_a_ripe"] as const) {
      const b = LETTER_A_FRUIT_ATLAS.assets[name];
      const crop = cropSheet(letterImg.bitmap.data, letterImg.bitmap.width, b.sx, b.sy, b.sw, b.sh);
      const pass1 = { data: new Uint8ClampedArray(crop.data), width: crop.width, height: crop.height } as ImageData;
      keyOutBorderConnectedGutterInImageData(pass1, lBg, 42);
      console.log("letter", name, "removed", countPass2Removed(pass1, lBg, strictTol));
    }
  }
}

main();
