import { Jimp } from "jimp";
import { estimateBackgroundColor, isBackgroundPixel } from "../lib/topdown/sprite-edge-detection";
import { letterFruitStageColumnFromGutters } from "../lib/topdown/letter-fruit-detect";

const SHEET = "public/assets/Letter Fruit Stages/Letter A Stages.png";
const TOL = 42;

async function main() {
  const img = await Jimp.read(SHEET);
  const { data, width, height } = img.bitmap;
  const bg = estimateBackgroundColor(data, width, height);

  const columns = [153, 460, 768, 1075, 1380].map((x) =>
    letterFruitStageColumnFromGutters(data, width, height, x),
  );

  for (let y = 690; y <= 780; y++) {
    const counts = columns.map((col) => {
      let c = 0;
      for (let x = col.sx; x < col.sx + col.sw; x++) {
        if (!isBackgroundPixel(data, width, x, y, bg, TOL)) c++;
      }
      return c;
    });
    const active = counts.filter((c) => c > 8).length;
    if (active >= 1) {
      console.log("y", y, "active cols", active, "counts", counts.join(","));
    }
  }
}

main();
