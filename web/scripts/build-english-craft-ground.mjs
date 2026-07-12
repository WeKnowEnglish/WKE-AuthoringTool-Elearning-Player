import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TILE_SIZE = 80;
const TILE_NATIVE_WIDTH = 197;
const TILE_NATIVE_HEIGHT = 174;
const TILE_LIP_NATIVE = 38;
const ROW_STRIDE = TILE_SIZE - Math.round((TILE_LIP_NATIVE * TILE_SIZE) / TILE_NATIVE_WIDTH);
const COLS = 20;
const ROWS = 11;
const WIDTH = COLS * TILE_SIZE;
const HEIGHT = (ROWS - 1) * ROW_STRIDE + TILE_SIZE;
const PACK_DIR = path.join(process.cwd(), "public", "assets", "tiles", "Grass_Tile_Pack");
const OUTPUT_DIR = path.join(process.cwd(), "public", "assets", "live-game");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "english-craft-ground-v1.webp");

const sources = {
  green_grass: "green_grass.png",
  darkgreen_grass: "darkgreen_grass.png",
  yellow_grass: "yellow_grass.png",
  clover_grass: "clover_grass.png",
  flowers_grass: "flowers_grass.png",
  sprite_06: "sprite-06.png",
  sprite_15: "sprite-15.png",
  sprite_22: "sprite-22.png",
  sprite_31: "sprite-31.png",
};
const baseVariants = ["green_grass", "darkgreen_grass", "yellow_grass"];
const decorVariants = ["clover_grass", "flowers_grass", "sprite_06", "sprite_15", "sprite_22", "sprite_31"];

function hashCell(col, row) {
  return (col * 374761 + row * 668265) % 1000;
}

function pickBaseTile(col, row) {
  const hash = hashCell(col, row);
  if (row >= 7) return hash % 5 === 0 ? "darkgreen_grass" : "green_grass";
  if (row <= 3) return hash % 4 === 0 ? "yellow_grass" : "green_grass";
  return baseVariants[hash % baseVariants.length] ?? "green_grass";
}

function pickTile(col, row) {
  if (row >= 5 && row <= 6 && col >= 4 && col <= 15) return null;
  const hash = hashCell(col + 7, row + 13);
  return hash % 17 === 0 ? decorVariants[hash % decorVariants.length] : pickBaseTile(col, row);
}

await mkdir(OUTPUT_DIR, { recursive: true });

const resizedTiles = new Map();
for (const [tileId, filename] of Object.entries(sources)) {
  resizedTiles.set(
    tileId,
    await sharp(path.join(PACK_DIR, filename))
      .resize({ width: TILE_SIZE })
      .png()
      .toBuffer(),
  );
}

const resizedHeight = Math.round((TILE_NATIVE_HEIGHT * TILE_SIZE) / TILE_NATIVE_WIDTH);
const composites = [];
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    const tileId = pickTile(col, row);
    if (!tileId) continue;
    composites.push({
      input: resizedTiles.get(tileId),
      left: col * TILE_SIZE,
      top: row * ROW_STRIDE + TILE_SIZE - resizedHeight,
    });
  }
}

await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
    background: "#2d1a12",
  },
})
  .composite(composites)
  .webp({ quality: 86, effort: 6 })
  .toFile(OUTPUT_PATH);

console.log(`Built ${path.relative(process.cwd(), OUTPUT_PATH)} (${WIDTH}x${HEIGHT}).`);
