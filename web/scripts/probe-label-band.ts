import { Jimp } from "jimp";
import {
  bboxOfContentInRect,
  estimateBackgroundColor,
  isBackgroundPixel,
} from "../lib/topdown/sprite-edge-detection";
import { letterFruitStageColumnFromGutters } from "../lib/topdown/letter-fruit-detect";
import { LETTER_A_FRUIT_ATLAS } from "../lib/topdown/letter-fruit-atlas";

const SHEET = "public/assets/Letter Fruit Stages/Letter A Stages.png";
const TOL = 42;

async function main() {
  const img = await Jimp.read(SHEET);
  const { data, width, height } = img.bitmap;
  const bg = estimateBackgroundColor(data, width, height);

  console.log("sheet", width, height, "82% cap y =", Math.floor(height * 0.82));

  for (let y = 650; y <= 820; y += 10) {
    let content = 0;
    for (let x = 0; x < width; x++) {
      if (!isBackgroundPixel(data, width, x, y, bg, TOL)) content++;
    }
    console.log("full-row y", y, "content px", content);
  }

  const stages = [
    { name: "seed", x: 153 },
    { name: "sprout", x: 460 },
    { name: "young", x: 768 },
    { name: "growing", x: 1075 },
    { name: "ripe", x: 1380 },
  ] as const;

  for (const stage of stages) {
    const col = letterFruitStageColumnFromGutters(data, width, height, stage.x);
    const saved = LETTER_A_FRUIT_ATLAS.assets[`letter_a_${stage.name}`];
    const bottom = saved.sy + saved.sh;

    let labelStart = height;
    for (let y = bottom + 1; y < height; y++) {
      let content = 0;
      for (let x = col.sx; x < col.sx + col.sw; x++) {
        if (!isBackgroundPixel(data, width, x, y, bg, TOL)) content++;
      }
      if (content > 8) {
        labelStart = Math.min(labelStart, y);
      }
    }

    const scan780 = bboxOfContentInRect(data, width, height, {
      sx: col.sx,
      sy: 200,
      sw: col.sw,
      sh: 581,
    }, { bgTolerance: TOL, minSize: 8 });

    const scan720 = bboxOfContentInRect(data, width, height, {
      sx: col.sx,
      sy: 200,
      sw: col.sw,
      sh: 521,
    }, { bgTolerance: TOL, minSize: 8 });

    console.log(stage.name, {
      savedBottom: bottom,
      labelStartBelowArt: labelStart === height ? null : labelStart,
      scan780sh: scan780?.sh,
      scan720sh: scan720?.sh,
      savedSh: saved.sh,
    });
  }
}

main();
