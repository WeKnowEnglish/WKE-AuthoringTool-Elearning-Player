import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace, Vector3 } from "three";
import { latLonToNormal } from "./sphere-wrap";
import { oceanLandInfluences } from "./world-landmasses";

const DEEP = [0.086, 0.227, 0.541] as const;
const SHELF = [0.114, 0.373, 0.78] as const;
const SHALLOW = [0.165, 0.659, 0.769] as const;
const TRENCH = [0.059, 0.145, 0.345] as const;
const VERTEX = new Color();

function angleDelta(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a: readonly [number, number, number], b: readonly [number, number, number], t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** Paint shallows, shelf, deep, and the adventure crossing onto an ocean sphere. */
export function applyOceanDepthColors(geometry: BufferGeometry): void {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const influences = oceanLandInfluences().map((land) => ({
    ...land,
    center: latLonToNormal(land.lat, land.lon),
  }));
  const normal = new Vector3();

  for (let index = 0; index < position.count; index += 1) {
    normal.set(position.getX(index), position.getY(index), position.getZ(index)).normalize();
    let shallow = 0;
    for (const land of influences) {
      const angular = Math.acos(Math.min(1, Math.max(-1, normal.dot(land.center))));
      let falloff = smoothstep(land.radius * 2.5, land.radius * 0.32, angular);
      if (land.homeWaters) falloff *= 1.4;
      shallow = Math.max(shallow, falloff);
    }

    const lon = (Math.atan2(normal.x, normal.z) * 180) / Math.PI;
    const crossing = Math.max(0, 1 - angleDelta(lon, 90) / 22, 1 - angleDelta(lon, -90) / 22);

    let rgb = mix(DEEP, SHELF, Math.min(1, shallow * 0.78));
    if (shallow > 0.42) rgb = mix(rgb, SHALLOW, smoothstep(0.42, 0.95, shallow));
    if (crossing > 0.15) rgb = mix(rgb, TRENCH, crossing * (1 - shallow * 0.55));

    VERTEX.setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace);
    colors[index * 3] = VERTEX.r;
    colors[index * 3 + 1] = VERTEX.g;
    colors[index * 3 + 2] = VERTEX.b;
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3));
}
