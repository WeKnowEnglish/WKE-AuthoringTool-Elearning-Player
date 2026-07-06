import { Jimp } from "jimp";
import { estimateBackgroundColor } from "../lib/topdown/sprite-edge-detection";
import {
  keyOutGutterInImageData,
} from "../lib/topdown/gutter-key-sprite";
import { GARDEN_SPRITE_ATLAS } from "../lib/topdown/garden-sprite-atlas";
import { LETTER_A_FRUIT_ATLAS } from "../lib/topdown/letter-fruit-atlas";

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

function countTransparent(image: ImageData): number {
  let n = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i]! < 12) n++;
  }
  return n;
}

async function main() {
  const gardenImg = await Jimp.read("public/assets/language_garden_sheet.png");
  const gBg = estimateBackgroundColor(
    gardenImg.bitmap.data,
    gardenImg.bitmap.width,
    gardenImg.bitmap.height,
  );

  console.log("=== Garden (dual tol) ===");
  for (const name of ["item_watering_can", "item_fertilizer", "weed_monster"] as const) {
    const b = GARDEN_SPRITE_ATLAS.assets[name];
    const crop = cropSheet(gardenImg.bitmap.data, gardenImg.bitmap.width, b.sx, b.sy, b.sw, b.sh);
    keyOutGutterInImageData(crop, gBg, 42);
    console.log(name, "transparent px:", countTransparent(crop));
  }

  const letterImg = await Jimp.read("public/assets/Letter Fruit Stages/Letter A Stages.png");
  const lBg = estimateBackgroundColor(
    letterImg.bitmap.data,
    letterImg.bitmap.width,
    letterImg.bitmap.height,
  );

  console.log("\n=== Letter fruit (dual tol) ===");
  for (const name of ["letter_a_young", "letter_a_ripe"] as const) {
    const b = LETTER_A_FRUIT_ATLAS.assets[name];
    const crop = cropSheet(letterImg.bitmap.data, letterImg.bitmap.width, b.sx, b.sy, b.sw, b.sh);
    keyOutGutterInImageData(crop, lBg, 42);
    console.log(name, "transparent px:", countTransparent(crop));
  }
}

main();
