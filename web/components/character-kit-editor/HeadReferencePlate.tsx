"use client";

import { useTexture } from "@react-three/drei";
import { DoubleSide, SRGBColorSpace } from "three";
import { HEAD_PLATE_DEPTH, HEAD_PLATE_SIZE } from "@/lib/character/kit/head-plates";

type Props = {
  src: string;
  opacity?: number;
};

/**
 * Camera-facing reference photo. Optional vibe plate — vinyl sculpting
 * is click-to-stamp on the lathe cage, not a silhouette overlay match.
 */
export function HeadReferencePlate({ src, opacity = 0.55 }: Props) {
  const texture = useTexture(src);
  texture.colorSpace = SRGBColorSpace;
  return (
    <mesh position={[0, 0.02, HEAD_PLATE_DEPTH]} renderOrder={0} raycast={() => {}}>
      <planeGeometry args={[HEAD_PLATE_SIZE, HEAD_PLATE_SIZE]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}
