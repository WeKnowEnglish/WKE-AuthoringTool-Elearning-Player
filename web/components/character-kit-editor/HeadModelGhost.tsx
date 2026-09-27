"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Color, DoubleSide, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { SEED_HEAD_GHOST_LIFT_Y, SEED_HEAD_GHOST_SCALE, SEED_HEAD_GHOST_SRC } from "@/lib/character/kit/head-plates";

type Props = {
  src?: string;
  opacity?: number;
  wireframe?: boolean;
  scale?: number;
};

function fitGhost(root: Object3D, scale: number, liftY: number) {
  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const center = box.getCenter(new Vector3());
  root.position.x -= center.x;
  root.position.y -= center.y;
  root.position.z -= center.z;
  root.scale.multiplyScalar(scale);
  root.position.y += liftY;
}

/**
 * Optional Mixamo vibe overlay. Not a silhouette to match — vinyl sculpting
 * is click-to-stamp on the lathe cage.
 */
export function HeadModelGhost({
  src = SEED_HEAD_GHOST_SRC,
  opacity = 0.32,
  wireframe = false,
  scale = SEED_HEAD_GHOST_SCALE,
}: Props) {
  const { scene } = useGLTF(src);
  const object = useMemo(() => {
    const cloned = scene.clone(true);
    const tint = new Color("#2563eb");
    cloned.traverse((child) => {
      if (!(child instanceof Mesh) || !child.material) return;
      child.material = new MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity,
        depthWrite: false,
        wireframe,
        side: DoubleSide,
      });
      child.renderOrder = 2;
      child.raycast = () => {};
    });
    fitGhost(cloned, scale, SEED_HEAD_GHOST_LIFT_Y);
    return cloned;
  }, [opacity, scale, scene, wireframe]);

  return <primitive object={object} />;
}

useGLTF.preload(SEED_HEAD_GHOST_SRC);
