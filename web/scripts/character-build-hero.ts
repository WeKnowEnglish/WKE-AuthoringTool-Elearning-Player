/**
 * Local hero mesh builder. Cursor / Codex uses this — no cloud mesher.
 *
 * From a reference image:
 *   1. Look at the photo.
 *   2. Write a kit JSON (profile rings, colors, eyes, hair shell + tufts).
 *   3. Run:
 *        npm run character:build-hero -- path/to/kit.json
 *      or print a blank recipe:
 *        npm run character:build-hero -- --print-default
 *
 * Writes public/characters/heroes/hero_kid_v1.glb by default.
 */
import "./node-file-reader";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildHeroObject, disposeHeroObject } from "../lib/character/kit/build-hero-object";
import { DEFAULT_CHARACTER_KIT } from "../lib/character/kit/kit-defaults";
import { normalizeCharacterKit } from "../lib/character/kit/kit-normalize";
import { kitToPrettyJson } from "../lib/character/kit/kit-storage";

function parseArgs(argv: string[]) {
  const args = { printDefault: false, image: null as string | null, out: "public/characters/heroes/hero_kid_v1.glb" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (token === "--print-default") args.printDefault = true;
    else if (token === "--out") {
      args.out = argv[index + 1] ?? args.out;
      index += 1;
    } else if (!token.startsWith("-") && !args.image) args.image = token;
  }
  return args;
}

async function exportGlb(kitPath: string | null, outRel: string) {
  const raw = kitPath ? JSON.parse(await readFile(path.resolve(process.cwd(), kitPath), "utf8")) : DEFAULT_CHARACTER_KIT;
  const kit = normalizeCharacterKit(raw);
  const group = buildHeroObject(kit);
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(group, { binary: true });
  disposeHeroObject(group);
  if (!(result instanceof ArrayBuffer)) {
    throw new Error("GLTFExporter did not return a binary GLB.");
  }
  const outFile = path.resolve(process.cwd(), outRel);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, Buffer.from(result));
  process.stdout.write(`Wrote ${path.relative(process.cwd(), outFile)} from ${kit.name}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.printDefault) {
    process.stdout.write(kitToPrettyJson(DEFAULT_CHARACTER_KIT));
    return;
  }
  await exportGlb(args.image, args.out);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
