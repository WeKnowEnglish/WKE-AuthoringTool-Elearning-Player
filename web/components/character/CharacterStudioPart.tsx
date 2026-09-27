"use client";

import { useGLTF } from "@react-three/drei";
import { Component, useMemo, type ReactNode } from "react";
import { Box3, Color, Mesh, Vector3, type Material, type Object3D } from "three";
import type { CharacterAlign } from "@/lib/character/character-types";
import { applyPolygonMask } from "@/lib/character/kit/polygon-mask";
import { applyRegionHighlights, dimPreviewMeshes } from "@/lib/character/kit/apply-region-highlights";
import { anyRegionHighlight, type RegionHighlightFlags } from "@/lib/character/kit/highlight-regions";

type StudioProps = {
  src: string;
  objectName?: string;
  tint?: string;
  namedTints?: Record<string, string>;
  hiddenNames?: string[];
  align?: CharacterAlign;
  targetHeight?: number;
  polygonMask?: boolean;
  highlights?: RegionHighlightFlags;
};

function findNamed(root: Object3D, name?: string): Object3D {
  if (!name) return root;
  return root.getObjectByName(name) ?? root;
}

function tintObject(root: Object3D, tint?: string) {
  if (!tint) return;
  const color = new Color(tint);
  root.traverse((object) => {
    if (!(object instanceof Mesh) || !object.material) return;
    if (object.userData.wkeTint === "none") return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const next = materials.map((material) => cloneTintedMaterial(material, color));
    object.material = Array.isArray(object.material) ? next : next[0];
  });
}

function tintNamed(root: Object3D, namedTints?: Record<string, string>) {
  if (!namedTints) return;
  root.traverse((object) => {
    if (!(object instanceof Mesh) || !object.material) return;
    const tintKey =
      object.name in namedTints
        ? object.name
        : object.parent && object.parent.name in namedTints
          ? object.parent.name
          : object.userData.wkeTint === "hair"
            ? "Hair"
            : object.userData.wkeTint === "skin"
              ? "Scalp"
              : undefined;
    const tint = tintKey ? namedTints[tintKey] : undefined;
    if (!tint) return;
    const color = new Color(tint);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const next = materials.map((material) => cloneTintedMaterial(material, color));
    object.material = Array.isArray(object.material) ? next : next[0];
  });
}

function hideNamed(root: Object3D, names?: string[]) {
  if (!names?.length) return;
  const hidden = new Set(names);
  root.traverse((object) => {
    if (hidden.has(object.name)) object.visible = false;
  });
}

function cloneTintedMaterial(material: Material, color: Color): Material {
  const cloned = material.clone();
  if ("color" in cloned && cloned.color instanceof Color) {
    cloned.color.copy(color);
  }
  return cloned;
}

function modulateObject(root: Object3D, align: CharacterAlign = "center", targetHeight?: number) {
  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const pinY = align === "bottom" ? box.min.y : align === "top" ? box.max.y : center.y;
  root.position.x -= center.x;
  root.position.y -= pinY;
  root.position.z -= center.z;
  if (targetHeight && size.y > 0.0001) {
    root.scale.multiplyScalar(targetHeight / size.y);
  }
}

export function CharacterStudioPart({
  src,
  objectName,
  tint,
  namedTints,
  hiddenNames,
  align,
  targetHeight,
  polygonMask = false,
  highlights,
}: StudioProps) {
  const { scene } = useGLTF(src);
  const hiddenKey = hiddenNames?.join("|") ?? "";
  const namedKey = namedTints ? JSON.stringify(namedTints) : "";
  const highlightKey = highlights ? JSON.stringify(highlights) : "";
  const object = useMemo(() => {
    const cloned = scene.clone(true);
    const target = findNamed(cloned, objectName);
    tintObject(target, tint);
    tintNamed(target, namedTints);
    hideNamed(target, hiddenNames);
    modulateObject(target, align, targetHeight);
    try {
      if (highlights && anyRegionHighlight(highlights)) applyRegionHighlights(target, highlights);
      if (polygonMask) applyPolygonMask(target);
      if (highlights && anyRegionHighlight(highlights)) dimPreviewMeshes(target);
    } catch {
      if (polygonMask) applyPolygonMask(target);
    }
    return target;
  }, [align, hiddenKey, highlightKey, namedKey, objectName, polygonMask, scene, targetHeight, tint]);

  return <primitive object={object} />;
}

type BoundaryProps = {
  resetKey: string;
  fallback: ReactNode;
  children: ReactNode;
};

type BoundaryState = { failed: boolean };

export class StudioPartBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
