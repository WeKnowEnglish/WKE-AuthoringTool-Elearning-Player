import path from "node:path";
import sharp from "sharp";

const assetDirectory = path.join(process.cwd(), "public", "pilots", "connected-classroom");
const assetNames = [
  "students-left",
  "teacher",
  "students-right",
  "student-purple-online",
  "student-green-online",
  "student-blue-online",
  "student-yellow-online",
];

function isOuterBackground(data, offset) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const darkest = Math.min(red, green, blue);
  const lightest = Math.max(red, green, blue);
  return darkest >= 205 && lightest - darkest <= 28;
}

for (const assetName of assetNames) {
  const inputPath = path.join(assetDirectory, `${assetName}.webp`);
  const outputPath = path.join(assetDirectory, `${assetName}-transparent.webp`);
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex) => {
    if (visited[pixelIndex]) return;
    const offset = pixelIndex * channels;
    if (!isOuterBackground(data, offset)) return;
    visited[pixelIndex] = 1;
    queue[tail++] = pixelIndex;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head++];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  for (let pixelIndex = 0; pixelIndex < visited.length; pixelIndex += 1) {
    if (!visited[pixelIndex]) continue;
    const offset = pixelIndex * channels;
    const darkest = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    data[offset + 3] = Math.max(0, Math.min(255, Math.round((238 - darkest) * 7.5)));
  }

  await sharp(data, { raw: info })
    .webp({ quality: 84, alphaQuality: 100, smartSubsample: true })
    .toFile(outputPath);
  console.log(`Created ${path.basename(outputPath)}`);
}
