"use client";

import type { CharacterBodyRig, CharacterConfig } from "@/lib/character/character-types";
import { ToyClothMaterial, ToyShoeMaterial, ToySkinMaterial } from "../toy-materials";

type Props = {
  config: CharacterConfig;
  rig: CharacterBodyRig;
};

/**
 * Vinyl-toy body that matches the kit head: rounded capsules, no boxes.
 * Authored in world space on the classic rig sockets.
 */
export function VinylKidBody({ config, rig }: Props) {
  const s = rig.partScale;
  const hips = rig.sockets.hips;
  const chest = rig.sockets.chest;
  const neck = rig.sockets.neck;
  const feet = rig.sockets.feet;
  const skin = config.skinColor;
  const hoodie = config.topColor;
  const shorts = config.bottomColor ?? config.topColor;
  const shoes = config.shoeColor ?? "#F8FAFC";
  const cuff = "#4338CA";

  return (
    <group name="vinylKidBody">
      <Shoe side={-1} x={-0.28 * s} y={feet[1]} z={feet[2]} scale={s} color={shoes} accent={hoodie} />
      <Shoe side={1} x={0.28 * s} y={feet[1]} z={feet[2]} scale={s} color={shoes} accent={hoodie} />

      <mesh position={[-0.28 * s, 0.7 * s, 0.06]} scale={s}>
        <capsuleGeometry args={[0.18, 0.58, 10, 20]} />
        <ToySkinMaterial color={skin} />
      </mesh>
      <mesh position={[0.28 * s, 0.7 * s, 0.06]} scale={s}>
        <capsuleGeometry args={[0.18, 0.58, 10, 20]} />
        <ToySkinMaterial color={skin} />
      </mesh>
      <mesh position={[-0.28 * s, 1.04 * s, 0.04]} scale={s}>
        <sphereGeometry args={[0.2, 18, 14]} />
        <ToySkinMaterial color={skin} />
      </mesh>
      <mesh position={[0.28 * s, 1.04 * s, 0.04]} scale={s}>
        <sphereGeometry args={[0.2, 18, 14]} />
        <ToySkinMaterial color={skin} />
      </mesh>

      <mesh position={[hips[0], hips[1] + 0.02 * s, hips[2] + 0.02]} scale={[1.08 * s, 0.58 * s, 0.82 * s]}>
        <sphereGeometry args={[0.62, 24, 18]} />
        <ToyClothMaterial color={shorts} />
      </mesh>
      <mesh position={[-0.28 * s, hips[1] - 0.28 * s, 0.04]} scale={s}>
        <capsuleGeometry args={[0.27, 0.36, 10, 20]} />
        <ToyClothMaterial color={shorts} />
      </mesh>
      <mesh position={[0.28 * s, hips[1] - 0.28 * s, 0.04]} scale={s}>
        <capsuleGeometry args={[0.27, 0.36, 10, 20]} />
        <ToyClothMaterial color={shorts} />
      </mesh>

      <mesh position={[chest[0], chest[1] - 0.12 * s, 0.06]} scale={[1.12 * s, 1 * s, 0.9 * s]}>
        <capsuleGeometry args={[0.5, 0.78, 12, 24]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>
      <mesh position={[-0.42 * s, chest[1] + 0.18 * s, 0.04]} scale={s}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>
      <mesh position={[0.42 * s, chest[1] + 0.18 * s, 0.04]} scale={s}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>
      <mesh position={[0, chest[1] - 0.22 * s, 0.38 * s]} scale={[0.62 * s, 0.32 * s, 0.18 * s]}>
        <sphereGeometry args={[0.4, 16, 12]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>
      <mesh position={[0, chest[1] - 0.52 * s, 0.04]} rotation={[Math.PI / 2, 0, 0]} scale={s}>
        <torusGeometry args={[0.46, 0.055, 10, 24]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>
      <mesh position={[0, neck[1] - 0.18 * s, -0.3 * s]} scale={[0.82 * s, 0.58 * s, 0.52 * s]}>
        <sphereGeometry args={[0.48, 20, 16]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>
      <mesh position={[0, neck[1] - 0.08 * s, 0.08]} rotation={[0.22, 0, 0]} scale={s}>
        <torusGeometry args={[0.24, 0.075, 12, 24, Math.PI * 1.7]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>

      <mesh position={[0, neck[1] + 0.06 * s, 0.05]} scale={s}>
        <capsuleGeometry args={[0.15, 0.16, 8, 16]} />
        <ToySkinMaterial color={skin} />
      </mesh>

      <Arm side={-1} shoulderY={chest[1] + 0.08 * s} scale={s} hoodie={hoodie} cuff={cuff} skin={skin} />
      <Arm side={1} shoulderY={chest[1] + 0.08 * s} scale={s} hoodie={hoodie} cuff={cuff} skin={skin} />
    </group>
  );
}

function Arm({
  side,
  shoulderY,
  scale,
  hoodie,
  cuff,
  skin,
}: {
  side: -1 | 1;
  shoulderY: number;
  scale: number;
  hoodie: string;
  cuff: string;
  skin: string;
}) {
  return (
    <group position={[side * 0.58 * scale, shoulderY, 0.05]} rotation={[0.16, 0, side * 0.2]}>
      <mesh position={[0, -0.52 * scale, 0]} scale={scale}>
        <capsuleGeometry args={[0.155, 0.98, 10, 18]} />
        <ToyClothMaterial color={hoodie} />
      </mesh>
      <mesh position={[0, -1.04 * scale, 0.02]} scale={scale}>
        <sphereGeometry args={[0.155, 14, 12]} />
        <ToyClothMaterial color={cuff} />
      </mesh>
      <mesh position={[0, -1.18 * scale, 0.04]} scale={scale}>
        <sphereGeometry args={[0.175, 16, 12]} />
        <ToySkinMaterial color={skin} />
      </mesh>
    </group>
  );
}

function Shoe({
  side,
  x,
  y,
  z,
  scale,
  color,
  accent,
}: {
  side: -1 | 1;
  x: number;
  y: number;
  z: number;
  scale: number;
  color: string;
  accent: string;
}) {
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh position={[0, 0.03, 0.12]} scale={[1, 0.58, 1.42]}>
        <sphereGeometry args={[0.25, 18, 14]} />
        <ToyShoeMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.05, 0.1]} scale={[0.92, 0.26, 1.32]}>
        <sphereGeometry args={[0.25, 14, 10]} />
        <ToyShoeMaterial color="#E2E8F0" />
      </mesh>
      <mesh position={[0, 0.1, 0.02]} rotation={[0.28, 0, 0]} scale={[0.68, 0.24, 0.52]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <ToyClothMaterial color={accent} />
      </mesh>
      <mesh position={[side * 0.02, 0.05, 0.3]} scale={[0.52, 0.32, 0.4]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <ToyShoeMaterial color={color} />
      </mesh>
    </group>
  );
}
