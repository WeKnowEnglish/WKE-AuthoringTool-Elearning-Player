"use client";

import type { HeadRegions } from "@/lib/character/kit/kit-types";
import { useLayoutEffect, useMemo } from "react";
import { buildStudentHeadGeometry, DEFAULT_HEAD_REGIONS } from "./student-head-geometry";
import { HEAD_LANDMARKS } from "./student-head-landmarks";
import { ToySkinMaterial } from "./toy-materials";

type Props = {
  color: string;
  regions?: HeadRegions;
  earScale?: number;
};

function Ear({ side, color, scale }: { side: -1 | 1; color: string; scale: number }) {
  const landmark = side < 0 ? HEAD_LANDMARKS.leftEar : HEAD_LANDMARKS.rightEar;
  return (
    <mesh
      position={landmark}
      rotation={[0.08, side * 0.28, side * 0.08]}
      scale={[0.32 * scale, 0.62 * scale, 0.28 * scale]}
    >
      <sphereGeometry args={[0.24, 16, 14]} />
      <ToySkinMaterial color={color} />
    </mesh>
  );
}

export function StudentHead({ color, regions = DEFAULT_HEAD_REGIONS, earScale = 1 }: Props) {
  const geometry = useMemo(
    () => buildStudentHeadGeometry(regions),
    [regions.crown, regions.cheeks, regions.chin],
  );
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group name="studentHead">
      <mesh geometry={geometry}>
        <ToySkinMaterial color={color} />
      </mesh>
      <Ear side={-1} color={color} scale={earScale} />
      <Ear side={1} color={color} scale={earScale} />
      <mesh position={HEAD_LANDMARKS.neck}>
        <capsuleGeometry args={[0.16, 0.22, 8, 16]} />
        <ToySkinMaterial color={color} />
      </mesh>
    </group>
  );
}
