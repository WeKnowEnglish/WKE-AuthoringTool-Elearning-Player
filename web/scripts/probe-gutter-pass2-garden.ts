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
import { GARDEN_SPRITE_ATLAS } from "../lib/topdown/garden-sprite-atlas";

const SHEET = "public/assets/language_garden_sheet.png";
const TOL = 42;

const ASSETS = [
  { name: "watering_can", bounds: GARDEN_SPRITE_ATLAS.assets.item_watering_can },
  { name: "fertilizer", bounds: GARDEN_SPRITE_ATLAS.assets.item_fertilizer },
  { name: "weed_monster", bounds: GARDEN_SPRITE_ATLAS.assets.weed_monster },
] as const;

function cloneImageData(data: Uint8ClampedArray, w: number, h: number): ImageData {
  return { data: new Uint8ClampedArray(data), width: w, height: h } as ImageData;
}

async function main() {
  const img = await Jimp.read(SHEET);
  const { data: sheetData, width: sheetW, height: sheetH } = img.bitmap;
  const bg = estimateBackgroundColor(sheetData, sheetW, sheetH);
  console.log("sheet bg", bg, "tolerance", TOL);

  for (const asset of ASSETS) {
    const { sx, sy, sw, sh } = asset.bounds;
    const cropLen = sw * sh * 4;
    const raw = new Uint8ClampedArray(cropLen);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const si = ((sy + y) * sheetW + (sx + x)) * 4;
        const di = (y * sw + x) * 4;
        raw[di] = sheetData[si]!;
        raw[di + 1] = sheetData[si + 1]!;
        raw[di + 2] = sheetData[si + 2]!;
        raw[di + 3] = sheetData[si + 3]!;
      }
    }

    const pass1 = cloneImageData(raw, sw, sh);
    keyOutBorderConnectedGutterInImageData(pass1, bg, TOL);

    const pass2Only = cloneImageData(pass1.data, sw, sh);
    keyOutInteriorGutterHolesInImageData(pass2Only, bg, TOL);

    let pass2Removed = 0;
    const removedSamples: string[] = [];
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const pi = (y * sw + x) * 4;
        const wasOpaque = pass1.data[pi + 3]! >= 12;
        const nowTransparent = pass2Only.data[pi + 3]! < 12;
        if (wasOpaque && nowTransparent) {
          pass2Removed++;
          if (removedSamples.length < 8) {
            const r = raw[pi]!;
            const g = raw[pi + 1]!;
            const b = raw[pi + 2]!;
            const dist = colorDistance(bg, r, g, b).toFixed(1);
            removedSamples.push(`(${x},${y}) rgb(${r},${g},${b}) dist=${dist}`);
          }
        }
      }
    }

  // Count interior bg pixels still opaque after pass1 (candidates for pass2)
    let interiorBgAfterPass1 = 0;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const pi = (y * sw + x) * 4;
        if (pass1.data[pi + 3]! < 12) continue;
        if (isBackgroundPixel(pass1.data, sw, x, y, bg, TOL)) interiorBgAfterPass1++;
      }
    }

    console.log(`\n=== ${asset.name} ${sw}x${sh} ===`);
    console.log("pass2 removed pixels:", pass2Removed);
    console.log("interior bg candidates after pass1:", interiorBgAfterPass1);
    console.log("samples removed by pass2:", removedSamples.join("; "));
  }
}

main();
