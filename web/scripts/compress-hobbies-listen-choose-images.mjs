import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const MAX_EDGE = 1024;
const QUALITY = 82;

const publicDir = path.resolve("public/pilots/games-listen-choose/hobbies");
const contentPath = path.resolve(
  "content/pilots/games-listen-choose/hobbies-listen-choose.json",
);

const pack = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const used = new Set();

async function compressFile(absPngPath) {
  const base = path.basename(absPngPath, path.extname(absPngPath));
  const outName = `${base}.webp`;
  const outPath = path.join(publicDir, outName);
  const input = fs.readFileSync(absPngPath);
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? MAX_EDGE;
  const height = meta.height ?? MAX_EDGE;
  const longest = Math.max(width, height);
  const resized =
    longest > MAX_EDGE
      ? image.resize({
          width: width >= height ? MAX_EDGE : undefined,
          height: height > width ? MAX_EDGE : undefined,
          fit: "inside",
          withoutEnlargement: true,
        })
      : image;
  const output = await resized.webp({ quality: QUALITY }).toBuffer();
  fs.writeFileSync(outPath, output);
  return {
    outName,
    before: input.length,
    after: output.length,
    width,
    height,
  };
}

let totalBefore = 0;
let totalAfter = 0;

for (const screen of pack.screens) {
  for (const choice of screen.choices) {
    const url = String(choice.image_url ?? "");
    const match = url.match(/\/pilots\/games-listen-choose\/hobbies\/([^/?#]+)$/);
    if (!match) continue;
    const fileName = match[1];
    const abs = path.join(publicDir, fileName);
    if (!fs.existsSync(abs)) {
      console.warn("missing", fileName);
      continue;
    }
    if (!/\.png$/i.test(fileName)) {
      console.log("skip non-png", fileName);
      continue;
    }
    const result = await compressFile(abs);
    choice.image_url = `/pilots/games-listen-choose/hobbies/${result.outName}`;
    used.add(result.outName);
    totalBefore += result.before;
    totalAfter += result.after;
    console.log(
      `${fileName} → ${result.outName} (${Math.round(result.before / 1024)}KB → ${Math.round(result.after / 1024)}KB)`,
    );
    // Remove original PNG after successful convert.
    fs.unlinkSync(abs);
  }
}

fs.writeFileSync(contentPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(
  `done: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`,
);
console.log("updated", contentPath);
