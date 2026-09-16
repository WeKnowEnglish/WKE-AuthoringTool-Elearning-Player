"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { Box3, Vector3 } from "three";

type Props = {
  src: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** Fit the model's height to this many meters, then optionally sit it on the floor. */
  fitHeight?: number;
  ground?: boolean;
};

export function PlayGltf(props: Props) {
  return (
    <Suspense fallback={null}>
      <PlayGltfModel {...props} />
    </Suspense>
  );
}

function PlayGltfModel({ src, position, rotation, scale = 1, fitHeight, ground = true }: Props) {
  const gltf = useGLTF(src);
  const cloned = useMemo(() => {
    const next = gltf.scene.clone(true);
    next.position.set(0, 0, 0);
    next.rotation.set(0, 0, 0);
    next.scale.set(1, 1, 1);
    next.updateMatrixWorld(true);
    return next;
  }, [gltf.scene]);
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    const nextScale = fitHeight && size.y > 0.001 ? scale * (fitHeight / size.y) : scale;
    return { nextScale, minY: box.min.y };
  }, [cloned, fitHeight, scale]);
  const groundY = ground ? -fit.minY : 0;
  return (
    <group position={position} rotation={rotation} scale={fit.nextScale}>
      <group position={[0, groundY, 0]}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}
