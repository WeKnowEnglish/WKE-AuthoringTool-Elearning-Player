import { BoxGeometry, LineSegments, Mesh, MeshStandardMaterial, Object3D } from "three";
import { describe, expect, it } from "vitest";
import { applyPolygonMask, POLYGON_MASK_NAME } from "./polygon-mask";

describe("polygon-mask", () => {
  it("covers the painted mesh with a fill and every triangle edge", () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0xff0000 }));
    mesh.name = "Head";
    const root = new Object3D();
    root.add(mesh);
    applyPolygonMask(root);
    const overlay = mesh.getObjectByName(POLYGON_MASK_NAME);
    expect(overlay).toBeInstanceOf(LineSegments);
    expect(mesh.material.type).toBe("MeshBasicMaterial");
    applyPolygonMask(root);
    expect(mesh.children.filter((child) => child.name === POLYGON_MASK_NAME)).toHaveLength(1);
    mesh.geometry.dispose();
  });
});
