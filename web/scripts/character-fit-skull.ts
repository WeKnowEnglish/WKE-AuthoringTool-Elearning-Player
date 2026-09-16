/**
 * Scan seed_boy_head.glb (skin only) and print a closed skull profile.
 *
 *   npm run character:fit-skull -- public/characters/heroes/seed_boy_head.glb
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { classifyAlbedo, sampleRgb, type AlbedoClass } from "../lib/character/kit/extract-hair-from-glb";
import {
  collectHairPositions,
  collectSkullPositions,
  fitClosedSkullProfile,
  normalizeSkullProfile,
  profileToJson,
} from "../lib/character/kit/fit-seed-skull";
import { scanPointCloud } from "../lib/character/kit/fit-skull-filler";

const COMPONENT = { UNSIGNED_SHORT: 5123, UNSIGNED_INT: 5125, FLOAT: 5126 } as const;
const TYPE_SIZE: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

type Gltf = {
  meshes?: Array<{ primitives?: Array<{ attributes?: Record<string, number>; material?: number }> }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
  }>;
  bufferViews?: Array<{ buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }>;
  materials?: Array<{ pbrMetallicRoughness?: { baseColorTexture?: { index?: number } } }>;
  textures?: Array<{ source?: number }>;
  images?: Array<{ bufferView?: number }>;
};

function readGlb(buf: Buffer): { json: Gltf; bin: Buffer } {
  const jsonLen = buf.readUInt32LE(12);
  const jsonStart = 20;
  const json = JSON.parse(buf.subarray(jsonStart, jsonStart + jsonLen).toString("utf8")) as Gltf;
  let binHeader = jsonStart + jsonLen;
  binHeader += (4 - (binHeader % 4)) % 4;
  const binLen = buf.readUInt32LE(binHeader);
  return { json, bin: buf.subarray(binHeader + 8, binHeader + 8 + binLen) };
}

function componentBytes(componentType: number): number {
  return componentType === COMPONENT.FLOAT || componentType === COMPONENT.UNSIGNED_INT ? 4 : 2;
}

function readComponent(view: Buffer, offset: number, componentType: number): number {
  if (componentType === COMPONENT.FLOAT) return view.readFloatLE(offset);
  if (componentType === COMPONENT.UNSIGNED_INT) return view.readUInt32LE(offset);
  return view.readUInt16LE(offset);
}

function accessorData(json: Gltf, bin: Buffer, accessorIndex: number): number[] {
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`Missing accessor ${accessorIndex}`);
  const view = json.bufferViews?.[accessor.bufferView ?? -1];
  if (!view) throw new Error(`Missing bufferView for accessor ${accessorIndex}`);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const comps = TYPE_SIZE[accessor.type] ?? 1;
  const stride = view.byteStride ?? comps * componentBytes(accessor.componentType);
  const out: number[] = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const row = start + i * stride;
    for (let c = 0; c < comps; c += 1) {
      out.push(readComponent(bin, row + c * componentBytes(accessor.componentType), accessor.componentType));
    }
  }
  return out;
}

async function decodeBasecolor(json: Gltf, bin: Buffer) {
  const textureIndex = json.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture?.index ?? 1;
  const source = json.textures?.[textureIndex]?.source ?? 1;
  const image = json.images?.[source];
  if (image?.bufferView === undefined) throw new Error("Head GLB has no embedded basecolor.");
  const view = json.bufferViews?.[image.bufferView];
  if (!view) throw new Error("Missing basecolor bufferView.");
  const jpeg = Buffer.from(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
  return sharp(jpeg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function main() {
  const input = path.resolve(process.cwd(), process.argv[2] ?? "public/characters/heroes/seed_boy_head.glb");
  const { json, bin } = readGlb(await readFile(input));
  const primitive = json.meshes?.[0]?.primitives?.[0];
  const attributes = primitive?.attributes ?? {};
  if (attributes.POSITION === undefined || attributes.TEXCOORD_0 === undefined) {
    throw new Error("Expected POSITION and TEXCOORD_0.");
  }
  const positions = accessorData(json, bin, attributes.POSITION);
  const uvs = accessorData(json, bin, attributes.TEXCOORD_0);
  const pixels = await decodeBasecolor(json, bin);
  const vertexCount = positions.length / 3;
  const classes: AlbedoClass[] = [];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    classes.push(
      classifyAlbedo(...sampleRgb(pixels.data, pixels.info.width, pixels.info.height, uvs[vertex * 2]!, uvs[vertex * 2 + 1]!)),
    );
  }
  const skull = collectSkullPositions(positions, classes);
  const fused = scanPointCloud(positions);
  const skin = scanPointCloud(skull);
  const fitted = normalizeSkullProfile(fitClosedSkullProfile(skull, collectHairPositions(positions, classes)));
  process.stdout.write(
    `Fused ${fused.size.map((n) => n.toFixed(2)).join("×")}  skull-skin ${skin.size.map((n) => n.toFixed(2)).join("×")}  kept ${skull.length / 3} verts\n`,
  );
  process.stdout.write(
    `Fitted y ${fitted[0]!.y.toFixed(2)}…${fitted[fitted.length - 1]!.y.toFixed(2)}  rings ${fitted.length}\n`,
  );
  for (const ring of fitted) {
    process.stdout.write(`  y=${ring.y.toFixed(2)} rx=${ring.rx.toFixed(2)} rz=${ring.rz.toFixed(2)} z=${(ring.z ?? 0).toFixed(2)}\n`);
  }
  process.stdout.write(`${profileToJson(fitted)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
