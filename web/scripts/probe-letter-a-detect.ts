import { Jimp } from "jimp";
import { detectLetterFruitStageBoundsAtPoint } from "../lib/topdown/letter-fruit-detect";

async function main() {
  const path = "public/assets/Letter Fruit Stages/Letter A Stages.png";
  const img = await Jimp.read(path);
  const { data, width, height } = img.bitmap;
  const stages = [
    { name: "seed", x: 153 },
    { name: "sprout", x: 460 },
    { name: "young", x: 768 },
    { name: "growing", x: 1075 },
    { name: "ripe", x: 1380 },
  ];

  for (const stage of stages) {
    const best = detectLetterFruitStageBoundsAtPoint(
      data,
      width,
      height,
      stage.x,
      450,
    );
    console.log(stage.name, best);
  }
}

main();
