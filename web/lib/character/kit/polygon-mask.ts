import {
  Color,
  DoubleSide,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  WireframeGeometry,
  type Object3D,
} from "three";

/** Overlay name so we can skip nested mask lines if apply runs twice. */
export const POLYGON_MASK_NAME = "PolygonMask";

/**
 * Replace painted materials with a flat fill and every triangle edge.
 * Authoring view: inspect the mesh instead of the albedo.
 */
export function applyPolygonMask(root: Object3D) {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh && object.name !== POLYGON_MASK_NAME) meshes.push(object);
  });
  for (const mesh of meshes) {
    if (mesh.getObjectByName(POLYGON_MASK_NAME)) continue;
    mesh.material = new MeshBasicMaterial({
      color: new Color("#c5d0e0"),
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const wires = new LineSegments(
      new WireframeGeometry(mesh.geometry),
      new LineBasicMaterial({ color: new Color("#0f172a") }),
    );
    wires.name = POLYGON_MASK_NAME;
    wires.renderOrder = 2;
    mesh.add(wires);
  }
}
