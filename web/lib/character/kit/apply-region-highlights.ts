import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  type Texture,
} from "three";
import { POLYGON_MASK_NAME } from "./polygon-mask";
import {
  anyRegionHighlight,
  collectHighlightedTriangles,
  HIGHLIGHT_HEX,
  regionFromObjectName,
  sampleFromImageData,
  type RegionHighlightFlags,
} from "./highlight-regions";

export const REGION_HIGHLIGHT_NAME = "RegionHighlight";

function textureImageData(texture: Texture): { data: Uint8ClampedArray; width: number; height: number } | null {
  const image = texture.image as { width?: number; height?: number; data?: ArrayBufferView } | undefined;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;
  if (!image || !width || !height || typeof document === "undefined") return null;
  if (image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray) {
    return { data: new Uint8ClampedArray(image.data), width, height };
  }
  const max = 1024;
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

function materialMap(mesh: Mesh): Texture | null {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!material || !("map" in material)) return null;
  const map = material.map;
  return map && typeof map === "object" && "image" in map ? (map as Texture) : null;
}

function dimBaseMesh(mesh: Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const next = materials.map((material) => {
    const cloned = material.clone();
    cloned.transparent = true;
    cloned.opacity = 0.38;
    cloned.needsUpdate = true;
    return cloned;
  });
  mesh.material = Array.isArray(mesh.material) ? next : next[0]!;
}

function tintNamedRegion(mesh: Mesh, flags: RegionHighlightFlags) {
  const region = regionFromObjectName(mesh.name, mesh.parent?.name);
  if (!flags[region]) {
    dimBaseMesh(mesh);
    return;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const color = new Color(HIGHLIGHT_HEX[region]);
  for (const material of materials) {
    if ("map" in material) material.map = null;
    if ("color" in material && material.color instanceof Color) material.color.copy(color);
    material.transparent = false;
    material.opacity = 1;
    material.needsUpdate = true;
  }
}

function attributeValues(
  attr: { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number },
  itemSize: 2 | 3,
): number[] {
  const values: number[] = [];
  for (let i = 0; i < attr.count; i += 1) {
    values.push(attr.getX(i), attr.getY(i));
    if (itemSize === 3) values.push(attr.getZ(i));
  }
  return values;
}

function addTriangleOverlay(mesh: Mesh, flags: RegionHighlightFlags) {
  const position = mesh.geometry.getAttribute("position");
  if (!position) return;
  const uv = mesh.geometry.getAttribute("uv");
  const index = mesh.geometry.getIndex();
  const map = materialMap(mesh);
  const image = map ? textureImageData(map) : null;
  const sample = image ? sampleFromImageData(image.data, image.width, image.height) : null;
  const packed = collectHighlightedTriangles(
    attributeValues(position, 3),
    uv ? attributeValues(uv, 2) : null,
    index ? Array.from(index.array as ArrayLike<number>) : null,
    sample,
    flags,
  );
  if (packed.positions.length < 9) return;
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(packed.positions), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(packed.colors), 3));
  geometry.computeVertexNormals();
  const overlay = new Mesh(
    geometry,
    new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      side: DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  overlay.name = REGION_HIGHLIGHT_NAME;
  overlay.renderOrder = 3;
  mesh.add(overlay);
}

/** Colorize enabled face / face-part / hair polygons on a cloned preview. */
export function applyRegionHighlights(root: Object3D, flags: RegionHighlightFlags) {
  if (!anyRegionHighlight(flags)) return;
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (object.name === POLYGON_MASK_NAME || object.name === REGION_HIGHLIGHT_NAME) return;
    meshes.push(object);
  });
  for (const mesh of meshes) {
    try {
      const hasUv = Boolean(mesh.geometry.getAttribute("uv"));
      if (hasUv && materialMap(mesh)) addTriangleOverlay(mesh, flags);
      else tintNamedRegion(mesh, flags);
    } catch {
      // Keep the painted mesh if a texture read or overlay pack fails.
    }
  }
}

export function dimPreviewMeshes(root: Object3D) {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (object.name === POLYGON_MASK_NAME || object.name === REGION_HIGHLIGHT_NAME) return;
    dimBaseMesh(object);
  });
}
