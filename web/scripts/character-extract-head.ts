/**
 * Cut a static head mesh out of a Mixamo-rigged character GLB.
 *
 *   npm run character:extract-head -- public/characters/heroes/seed_boy.glb
 *
 * Writes public/characters/heroes/seed_boy_head.glb by default.
 * Then run `npm run character:extract-hair` to split Face / Hair.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  headBoneWeight,
  isHeadBoneName,
  orientExtractedHead,
  shouldKeepHeadVertex,
} from "../lib/character/kit/extract-head-from-glb";

const COMPONENT = {
  BYTE: 5120,
  UNSIGNED_BYTE: 5121,
  SHORT: 5122,
  UNSIGNED_SHORT: 5123,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,
} as const;

const TYPE_SIZE: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
};

type Gltf = {
  asset?: { generator?: string; version?: string };
  scenes?: Array<{ nodes?: number[] }>;
  scene?: number;
  nodes?: Array<{
    name?: string;
    mesh?: number;
    skin?: number;
    children?: number[];
    rotation?: number[];
    scale?: number[];
    translation?: number[];
  }>;
  meshes?: Array<{
    name?: string;
    primitives?: Array<{
      attributes?: Record<string, number>;
      indices?: number;
      material?: number;
    }>;
  }>;
  skins?: Array<{ joints?: number[]; inverseBindMatrices?: number }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
    normalized?: boolean;
  }>;
  bufferViews?: Array<{
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
  }>;
  buffers?: Array<{ byteLength: number; uri?: string }>;
  materials?: unknown[];
  textures?: unknown[];
  images?: Array<{ bufferView?: number; mimeType?: string; name?: string }>;
  samplers?: unknown[];
};

function parseArgs(argv: string[]) {
  const args = {
    input: "public/characters/heroes/seed_boy.glb",
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
  if (componentType === COMPONENT.SHORT || componentType === COMPONENT.UNSIGNED_SHORT) return 2;
  return 1;
}

function readComponent(view: Buffer, offset: number, componentType: number): number {
  if (componentType === COMPONENT.FLOAT) return view.readFloatLE(offset);
  if (componentType === COMPONENT.UNSIGNED_INT) return view.readUInt32LE(offset);
  if (componentType === COMPONENT.UNSIGNED_SHORT) return view.readUInt16LE(offset);
  if (componentType === COMPONENT.SHORT) return view.readInt16LE(offset);
  if (componentType === COMPONENT.UNSIGNED_BYTE) return view.readUInt8(offset);
  return view.readInt8(offset);
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input);
  const { json, bin } = readGlb(await readFile(inputPath));

  const mesh = json.meshes?.[0];
  const primitive = mesh?.primitives?.[0];
  const skin = json.skins?.[0];
  const attributes = primitive?.attributes ?? {};
  if (attributes.POSITION === undefined || primitive?.indices === undefined || !skin?.joints) {
    throw new Error("Expected a skinned triangle mesh with POSITION and indices.");
  }

  const nodes = json.nodes ?? [];
  const headJointIds = new Set<number>();
  skin.joints.forEach((nodeIndex, jointId) => {
    if (isHeadBoneName(nodes[nodeIndex]?.name ?? "")) headJointIds.add(jointId);
  });
  if (headJointIds.size === 0) throw new Error("No Head/Neck bones found on the Mixamo skin.");

  const positions = accessorData(json, bin, attributes.POSITION);
  const normals = attributes.NORMAL !== undefined ? accessorData(json, bin, attributes.NORMAL) : null;
  const uvs = attributes.TEXCOORD_0 !== undefined ? accessorData(json, bin, attributes.TEXCOORD_0) : null;
  const joints = attributes.JOINTS_0 !== undefined ? accessorData(json, bin, attributes.JOINTS_0) : null;
  const weights = attributes.WEIGHTS_0 !== undefined ? accessorData(json, bin, attributes.WEIGHTS_0) : null;
  const sourceIndex = accessorData(json, bin, primitive.indices);
  const vertexCount = positions.length / 3;
  if (!joints || !weights) throw new Error("Mesh has no JOINTS_0 / WEIGHTS_0 skin data.");

  const keep = new Uint8Array(vertexCount);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const weight = headBoneWeight(
      joints.slice(vertex * 4, vertex * 4 + 4),
      weights.slice(vertex * 4, vertex * 4 + 4),
      headJointIds,
    );
    if (shouldKeepHeadVertex(weight)) keep[vertex] = 1;
  }

  const remap = new Int32Array(vertexCount).fill(-1);
  const nextPositions: number[] = [];
  const nextNormals: number[] = [];
  const nextUvs: number[] = [];
  let kept = 0;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    if (!keep[vertex]) continue;
    remap[vertex] = kept;
    kept += 1;
    nextPositions.push(positions[vertex * 3]!, positions[vertex * 3 + 1]!, positions[vertex * 3 + 2]!);
    if (normals) nextNormals.push(normals[vertex * 3]!, normals[vertex * 3 + 1]!, normals[vertex * 3 + 2]!);
    if (uvs) nextUvs.push(uvs[vertex * 2]!, uvs[vertex * 2 + 1]!);
  }

  const nextIndices: number[] = [];
  for (let i = 0; i < sourceIndex.length; i += 3) {
    const a = remap[sourceIndex[i]!]!;
    const b = remap[sourceIndex[i + 1]!]!;
    const c = remap[sourceIndex[i + 2]!]!;
    if (a < 0 || b < 0 || c < 0) continue;
    nextIndices.push(a, b, c);
  }
  if (kept < 100 || nextIndices.length < 300) {
    throw new Error(`Head extract is too small (${kept} verts, ${nextIndices.length / 3} tris).`);
  }

  orientExtractedHead(nextPositions);
  const posBounds = bounds(nextPositions, 3);
  const parts: Buffer[] = [];
  const bufferViews: Gltf["bufferViews"] = [];
  const accessors: NonNullable<Gltf["accessors"]> = [];

  const pushView = (buffer: Buffer, stride?: number) => {
    const offset = parts.reduce((sum, part) => sum + part.length, 0);
    const padded = Buffer.concat([buffer, Buffer.alloc(pad4(buffer.length))]);
    parts.push(padded);
    bufferViews!.push({ buffer: 0, byteOffset: offset, byteLength: buffer.length, ...(stride ? { byteStride: stride } : {}) });
    return bufferViews!.length - 1;
  };

  const posView = pushView(packFloats(nextPositions), 12);
  accessors.push({
    bufferView: posView,
    componentType: COMPONENT.FLOAT,
    count: kept,
    type: "VEC3",
    min: posBounds.min,
    max: posBounds.max,
  });
  const nextAttributes: Record<string, number> = { POSITION: 0 };
  if (normals && nextNormals.length) {
    const nBounds = bounds(nextNormals, 3);
    accessors.push({
      bufferView: pushView(packFloats(nextNormals), 12),
      componentType: COMPONENT.FLOAT,
      count: kept,
      type: "VEC3",
      min: nBounds.min,
      max: nBounds.max,
    });
    nextAttributes.NORMAL = accessors.length - 1;
  }
  if (uvs && nextUvs.length) {
    accessors.push({
      bufferView: pushView(packFloats(nextUvs), 8),
      componentType: COMPONENT.FLOAT,
      count: kept,
      type: "VEC2",
    });
    nextAttributes.TEXCOORD_0 = accessors.length - 1;
  }
  const packedIndex = packIndices(nextIndices);
  accessors.push({
    bufferView: pushView(packedIndex.buffer),
    componentType: packedIndex.componentType,
    count: nextIndices.length,
    type: "SCALAR",
  });
  const indexAccessor = accessors.length - 1;

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

  const binBuffer = Buffer.concat(parts);
  const outJson = {
    asset: { version: "2.0", generator: "wke-extract-head" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "Head", mesh: 0 }],
    meshes: [
      {
        name: "Head",
        primitives: [
          {
            attributes: nextAttributes,
            indices: indexAccessor,
            material: primitive.material ?? 0,
          },
        ],
      },
    ],
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuffer.length }],
    materials: json.materials ?? [],
    textures: json.textures ?? [],
    images,
    samplers: json.samplers ?? [],
  };

  const outFile = path.resolve(process.cwd(), args.out);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, writeGlb(outJson, binBuffer));
  const size = posBounds.max.map((value, index) => value - (posBounds.min[index] ?? 0));
  process.stdout.write(
    `Wrote ${path.relative(process.cwd(), outFile)} (${kept} verts, ${nextIndices.length / 3} tris, size ${size.map((n) => n.toFixed(2)).join("×")})\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
