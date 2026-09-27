/**
 * Split a fused painted head GLB into Face + Hair meshes.
 *
 *   npm run character:extract-head -- public/characters/heroes/seed_boy.glb
 *   npm run character:extract-hair -- public/characters/heroes/seed_boy_head.glb
 *
 * Overwrites the head GLB with Face, Hair, and a procedural Scalp filler.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  assignTrianglePartsFlood,
  capBoundaryLoops,
  classifyAlbedo,
  compactIndexedMesh,
  compactSubmesh,
  findBoundaryLoops,
  isLikelyFaceVertex,
  meanUvForClass,
  reclaimHairFromFace,
  sampleRgb,
  seedVertexPart,
  type AlbedoClass,
  type MeshPart,
} from "../lib/character/kit/extract-hair-from-glb";
import {
  buildSkullFillerMesh,
  dropTrianglesAboveY,
  fitSkullProfile,
  percentile,
  scanPointCloud,
} from "../lib/character/kit/fit-skull-filler";

const COMPONENT = {
  UNSIGNED_SHORT: 5123,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,
} as const;

const TYPE_SIZE: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};

type Gltf = {
  asset?: { generator?: string; version?: string };
  scenes?: Array<{ nodes?: number[] }>;
  scene?: number;
  nodes?: Array<{ name?: string; mesh?: number; children?: number[]; extras?: Record<string, string> }>;
  meshes?: Array<{
    name?: string;
    primitives?: Array<{ attributes?: Record<string, number>; indices?: number; material?: number }>;
  }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
  }>;
  bufferViews?: Array<{ buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }>;
  buffers?: Array<{ byteLength: number }>;
  materials?: Array<Record<string, unknown> & { name?: string }>;
  textures?: Array<{ source?: number; sampler?: number }>;
  images?: Array<{ bufferView?: number; mimeType?: string; name?: string }>;
  samplers?: unknown[];
};

function parseArgs(argv: string[]) {
  const args = {
    input: "public/characters/heroes/seed_boy_head.glb",
    out: "public/characters/heroes/seed_boy_head.glb",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (token === "--out") {
      args.out = argv[index + 1] ?? args.out;
      index += 1;
    } else if (!token.startsWith("-")) args.input = token;
  }
  return args;
}

function readGlb(buf: Buffer): { json: Gltf; bin: Buffer } {
  const jsonLen = buf.readUInt32LE(12);
  const jsonStart = 20;
  const json = JSON.parse(buf.subarray(jsonStart, jsonStart + jsonLen).toString("utf8")) as Gltf;
  let binHeader = jsonStart + jsonLen;
  binHeader += (4 - (binHeader % 4)) % 4;
  const binLen = buf.readUInt32LE(binHeader);
  const binStart = binHeader + 8;
  return { json, bin: buf.subarray(binStart, binStart + binLen) };
}

function componentBytes(componentType: number): number {
  if (componentType === COMPONENT.FLOAT || componentType === COMPONENT.UNSIGNED_INT) return 4;
  return 2;
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

function bounds(values: number[], stride: number): { min: number[]; max: number[] } {
  const min = Array.from({ length: stride }, () => Number.POSITIVE_INFINITY);
  const max = Array.from({ length: stride }, () => Number.NEGATIVE_INFINITY);
  for (let i = 0; i < values.length; i += stride) {
    for (let c = 0; c < stride; c += 1) {
      const value = values[i + c]!;
      min[c] = Math.min(min[c]!, value);
      max[c] = Math.max(max[c]!, value);
    }
  }
  return { min, max };
}

function pad4(length: number): number {
  return (4 - (length % 4)) % 4;
}

function writeGlb(json: object, bin: Buffer): Buffer {
  const jsonText = Buffer.from(`${JSON.stringify(json)}\n`, "utf8");
  const jsonPad = Buffer.alloc(pad4(jsonText.length), 0x20);
  const jsonChunk = Buffer.concat([jsonText, jsonPad]);
  const binPad = Buffer.alloc(pad4(bin.length));
  const binChunk = Buffer.concat([bin, binPad]);
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.write("JSON", 4, "ascii");
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.write("BIN\0", 4, "ascii");
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

function packFloats(values: number[]): Buffer {
  const buf = Buffer.alloc(values.length * 4);
  for (let i = 0; i < values.length; i += 1) buf.writeFloatLE(values[i]!, i * 4);
  return buf;
}

function packIndices(indices: number[]): { buffer: Buffer; componentType: number } {
  const max = indices.reduce((high, value) => Math.max(high, value), 0);
  if (max <= 65535) {
    const buffer = Buffer.alloc(indices.length * 2);
    for (let i = 0; i < indices.length; i += 1) buffer.writeUInt16LE(indices[i]!, i * 2);
    return { buffer, componentType: COMPONENT.UNSIGNED_SHORT };
  }
  const buffer = Buffer.alloc(indices.length * 4);
  for (let i = 0; i < indices.length; i += 1) buffer.writeUInt32LE(indices[i]!, i * 4);
  return { buffer, componentType: COMPONENT.UNSIGNED_INT };
}

function basecolorImageIndex(json: Gltf): number {
  const material = json.materials?.[0] as
    | { pbrMetallicRoughness?: { baseColorTexture?: { index?: number } } }
    | undefined;
  const textureIndex = material?.pbrMetallicRoughness?.baseColorTexture?.index ?? 1;
  const texture = json.textures?.[textureIndex] as { source?: number } | undefined;
  return texture?.source ?? 1;
}

async function decodeBasecolor(json: Gltf, bin: Buffer) {
  const image = json.images?.[basecolorImageIndex(json)];
  if (image?.bufferView === undefined) throw new Error("Head GLB has no embedded basecolor.");
  const view = json.bufferViews?.[image.bufferView];
  if (!view) throw new Error("Missing basecolor bufferView.");
  const jpeg = Buffer.from(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
  const raw = await sharp(jpeg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return raw;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input);
  const { json, bin } = readGlb(await readFile(inputPath));
  const primitive = json.meshes?.[0]?.primitives?.[0];
  if ((json.meshes?.length ?? 0) > 1 || json.asset?.generator === "wke-extract-hair") {
    throw new Error("This GLB is already split. Re-run character:extract-head first, then character:extract-hair.");
  }
  const attributes = primitive?.attributes ?? {};
  if (attributes.POSITION === undefined || primitive?.indices === undefined || attributes.TEXCOORD_0 === undefined) {
    throw new Error("Expected a static head mesh with POSITION, TEXCOORD_0, and indices.");
  }

  const positions = accessorData(json, bin, attributes.POSITION);
  const normals = attributes.NORMAL !== undefined ? accessorData(json, bin, attributes.NORMAL) : null;
  const uvs = accessorData(json, bin, attributes.TEXCOORD_0);
  const indices = accessorData(json, bin, primitive.indices);
  const vertexCount = positions.length / 3;
  const triCount = indices.length / 3;
  const pixels = await decodeBasecolor(json, bin);

  const classes: AlbedoClass[] = [];
  const vertexParts: MeshPart[] = [];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const rgb = sampleRgb(pixels.data, pixels.info.width, pixels.info.height, uvs[vertex * 2]!, uvs[vertex * 2 + 1]!);
    const cls = classifyAlbedo(...rgb);
    classes.push(cls);
    vertexParts.push(
      seedVertexPart(cls, positions[vertex * 3]!, positions[vertex * 3 + 1]!, positions[vertex * 3 + 2]!),
    );
  }

  const parts = assignTrianglePartsFlood(indices, vertexParts, positions);
  const skinYs: number[] = [];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    if (classes[vertex] !== "skin") continue;
    const x = positions[vertex * 3]!;
    const y = positions[vertex * 3 + 1]!;
    const z = positions[vertex * 3 + 2]!;
    if (!isLikelyFaceVertex(x, y, z) || Math.abs(x) > 0.4) continue;
    skinYs.push(y);
  }
  const sampledHairline = skinYs.length ? percentile(skinYs, 0.94) : 0.24;
  const hairlineY = Math.min(0.28, Math.max(0.14, sampledHairline));
  const reclaimed = reclaimHairFromFace(indices, positions, parts, hairlineY, classes);
  const hairKeep = parts.map((part) => part === "hair");
  const faceKeep = parts.map((part) => part === "face");
  const hairTris = hairKeep.filter(Boolean).length;
  const faceTris = faceKeep.filter(Boolean).length;
  if (hairTris < 200 || faceTris < 200) {
    throw new Error(`Hair split looks wrong (${hairTris} hair tris, ${faceTris} face tris).`);
  }

  const originalScan = scanPointCloud(positions);
  let face = compactSubmesh(positions, normals, uvs, indices, faceKeep);
  const hair = compactSubmesh(positions, normals, uvs, indices, hairKeep);
  if (!face.normals || !face.uvs) throw new Error("Face mesh needs normals and UVs to cap.");
  face.indices = dropTrianglesAboveY(face.positions, face.indices, hairlineY);
  face = compactIndexedMesh(face.positions, face.normals, face.uvs, face.indices);
  if (!face.normals || !face.uvs) throw new Error("Face mesh lost attributes while compacting.");
  const faceScan = scanPointCloud(face.positions);
  const skinUv = meanUvForClass(uvs, classes, "skin");
  const loops = findBoundaryLoops(face.indices)
    .map((loop) => loop.length)
    .sort((a, b) => b - a);
  process.stdout.write(`Hairline y=${hairlineY.toFixed(2)}  reclaimed ${reclaimed} crown tris onto Hair\n`);
  process.stdout.write(
    `Face boundary loops: ${loops.slice(0, 12).join(", ")}${loops.length > 12 ? "…" : ""} (${loops.length} total)\n`,
  );
  const minLoop = Math.max(24, loops[2] ? loops[2] + 1 : 24);
  const caps = capBoundaryLoops(face.positions, face.normals, face.uvs, face.indices, skinUv, minLoop, -0.25);
  const fitted = fitSkullProfile(scanPointCloud(face.positions), originalScan, undefined, hairlineY);
  const scalp = buildSkullFillerMesh(fitted.rings, skinUv, 32, { joinY: fitted.joinY });
  process.stdout.write(
    `Scan original ${originalScan.size.map((n) => n.toFixed(2)).join("×")}  face ${faceScan.size.map((n) => n.toFixed(2)).join("×")}  filler y ${fitted.rings[0]!.y.toFixed(2)}…${fitted.rings[fitted.rings.length - 1]!.y.toFixed(2)} join ${fitted.joinY.toFixed(2)} rx ${fitted.rings[Math.floor(fitted.rings.length / 2)]!.rx.toFixed(2)}\n`,
  );

  const partsBin: Buffer[] = [];
  const bufferViews: NonNullable<Gltf["bufferViews"]> = [];
  const accessors: NonNullable<Gltf["accessors"]> = [];

  const pushView = (buffer: Buffer, stride?: number) => {
    const offset = partsBin.reduce((sum, part) => sum + part.length, 0);
    const padded = Buffer.concat([buffer, Buffer.alloc(pad4(buffer.length))]);
    partsBin.push(padded);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buffer.length, ...(stride ? { byteStride: stride } : {}) });
    return bufferViews.length - 1;
  };

  const packMesh = (mesh: { positions: number[]; normals: number[] | null; uvs: number[] | null; indices: number[] }) => {
    const posBounds = bounds(mesh.positions, 3);
    const attributesOut: Record<string, number> = {};
    accessors.push({
      bufferView: pushView(packFloats(mesh.positions), 12),
      componentType: COMPONENT.FLOAT,
      count: mesh.positions.length / 3,
      type: "VEC3",
      min: posBounds.min,
      max: posBounds.max,
    });
    attributesOut.POSITION = accessors.length - 1;
    if (mesh.normals) {
      const nBounds = bounds(mesh.normals, 3);
      accessors.push({
        bufferView: pushView(packFloats(mesh.normals), 12),
        componentType: COMPONENT.FLOAT,
        count: mesh.normals.length / 3,
        type: "VEC3",
        min: nBounds.min,
        max: nBounds.max,
      });
      attributesOut.NORMAL = accessors.length - 1;
    }
    if (mesh.uvs) {
      accessors.push({
        bufferView: pushView(packFloats(mesh.uvs), 8),
        componentType: COMPONENT.FLOAT,
        count: mesh.uvs.length / 2,
        type: "VEC2",
      });
      attributesOut.TEXCOORD_0 = accessors.length - 1;
    }
    const packedIndex = packIndices(mesh.indices);
    accessors.push({
      bufferView: pushView(packedIndex.buffer),
      componentType: packedIndex.componentType,
      count: mesh.indices.length,
      type: "SCALAR",
    });
    return { attributes: attributesOut, indices: accessors.length - 1 };
  };

  const facePrim = packMesh(face);
  const hairPrim = packMesh(hair);
  const scalpPrim = packMesh(scalp);

  const imageViews: number[] = [];
  for (const image of json.images ?? []) {
    if (image.bufferView === undefined) continue;
    const view = json.bufferViews?.[image.bufferView];
    if (!view) continue;
    const bytes = Buffer.from(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
    imageViews.push(pushView(bytes));
  }
  const images = (json.images ?? []).map((image, index) => ({
    name: image.name,
    mimeType: image.mimeType,
    bufferView: imageViews[index],
  }));

  const sourceMat = { ...(json.materials?.[0] ?? { name: "Face" }) };
  const faceMat = { ...sourceMat, name: "Face" };
  const hairMat = JSON.parse(JSON.stringify(sourceMat)) as typeof sourceMat;
  hairMat.name = "Hair";
  const scalpMat = {
    name: "Scalp",
    doubleSided: true,
    pbrMetallicRoughness: {
      baseColorFactor: [0.91, 0.72, 0.58, 1],
      metallicFactor: 0,
      roughnessFactor: 0.42,
    },
  };

  const binBuffer = Buffer.concat(partsBin);
  const outJson = {
    asset: { version: "2.0", generator: "wke-extract-hair" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: "Head", children: [1, 2, 3] },
      { name: "Face", mesh: 0, extras: { wkeTint: "none" } },
      { name: "Hair", mesh: 1, extras: { wkeTint: "hair" } },
      { name: "Scalp", mesh: 2, extras: { wkeTint: "skin" } },
    ],
    meshes: [
      { name: "Face", primitives: [{ ...facePrim, material: 0 }] },
      { name: "Hair", primitives: [{ ...hairPrim, material: 1 }] },
      { name: "Scalp", primitives: [{ ...scalpPrim, material: 2 }] },
    ],
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuffer.length }],
    materials: [faceMat, hairMat, scalpMat],
    textures: json.textures ?? [],
    images,
    samplers: json.samplers ?? [],
  };

  const outFile = path.resolve(process.cwd(), args.out);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, writeGlb(outJson, binBuffer));
  process.stdout.write(
    `Wrote ${path.relative(process.cwd(), outFile)} (${faceTris} face tris, ${hairTris} hair tris, ${caps} caps, scalp ${scalp.indices.length / 3} tris, of ${triCount} source tris)\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
