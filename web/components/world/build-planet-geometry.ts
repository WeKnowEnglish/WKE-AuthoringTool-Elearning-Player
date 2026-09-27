import { BufferAttribute, BufferGeometry, Color, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { GLOBE_RADIUS } from "./globe-config";
import { planetColor, planetSurfaceHeight } from "./planet-terrain";
import { vectorToLatLon } from "./sphere-wrap";

const VERTEX = new Color();
const NORMAL = new Vector3();

/** Grass sphere with raised cliff mesas. Campus stays a low meadow. */
export function buildPlanetGeometry(): BufferGeometry {
  const sphere = new SphereGeometry(GLOBE_RADIUS, 128, 96);
  const position = sphere.getAttribute("position");
  const colors = new Float32Array(position.count * 3);

  for (let index = 0; index < position.count; index += 1) {
    NORMAL.set(position.getX(index), position.getY(index), position.getZ(index)).normalize();
    const { lat, lon } = vectorToLatLon(NORMAL);
    const height = planetSurfaceHeight(lat, lon);
    const radius = GLOBE_RADIUS + height;
    position.setXYZ(index, NORMAL.x * radius, NORMAL.y * radius, NORMAL.z * radius);
    const rgb = planetColor(lat, lon);
    VERTEX.setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace);
    colors[index * 3] = VERTEX.r;
    colors[index * 3 + 1] = VERTEX.g;
    colors[index * 3 + 2] = VERTEX.b;
  }

  sphere.setAttribute("color", new BufferAttribute(colors, 3));
  sphere.computeVertexNormals();
  return sphere;
}
