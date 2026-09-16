"use client";

import { useTexture } from "@react-three/drei";
import { DoubleSide, SRGBColorSpace } from "three";
import { HEAD_PLATE_DEPTH, HEAD_PLATE_SIZE } from "@/lib/character/kit/head-plates";

type Props = {
  src: string;
  opacity?: number;
};

/**
 * Camera-facing reference photo. The 3D head (and seed ghost) sit on top of
 * this plate so Cursor can map a GLB silhouette onto an image.
 */
export function HeadReferencePlate({ src, opacity = 0.55 }: Props) {
  const texture = useTexture(src);
  texture.colorSpace = SRGBColorSpace;
  return (
    <mesh position={[0, 0.02, HEAD_PLATE_DEPTH]} renderOrder={0}>
      <planeGeometry args={[HEAD_PLATE_SIZE, HEAD_PLATE_SIZE]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}
