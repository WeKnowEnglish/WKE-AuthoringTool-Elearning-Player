import { Jimp } from "jimp";
import { estimateBackgroundColor, colorDistance } from "../lib/topdown/sprite-edge-detection";
import { GARDEN_SPRITE_ATLAS } from "../lib/topdown/garden-sprite-atlas";

const SHEET = "public/assets/language_garden_sheet.png";

async function main() {
  const img = await Jimp.read(SHEET);
  const { data, width } = img.bitmap;
  const bg = estimateBackgroundColor(data, width, img.bitmap.height);
  console.log("bg", bg);

  const b = GARDEN_SPRITE_ATLAS.assets.item_watering_can;
  // Sample a few points likely in handle hole vs metal shading
  const samples = [
    { label: "crop center", x: b.sx + Math.floor(b.sw / 2), y: b.sy + Math.floor(b.sh / 2) },
    { label: "upper crop", x: b.sx + 140, y: b.sy + 30 },
    { label: "handle area", x: b.sx + 180, y: b.sy + 50 },
  ];

  for (const s of samples) {
    const i = (s.y * width + s.x) * 4;
    const r = data[i]!;
    const g = data[i + 1]!;
    const bch = data[i + 2]!;
    console.log(s.label, `rgb(${r},${g},${bch})`, "dist", colorDistance(bg, r, g, bch).toFixed(1));
  }
}

main();
