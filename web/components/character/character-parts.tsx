"use client";

import type { CharacterBodyRig } from "@/lib/character/character-types";
import { ToyHairMaterial } from "./toy-materials";

type Colored = { color: string };

function Lambert({ color }: Colored) {
  return <meshLambertMaterial color={color} />;
}

export function BodyBase({
  rig,
  color,
  showTorso = true,
  showArms = true,
  showLegs = true,
}: {
  rig: CharacterBodyRig;
  color: string;
  showTorso?: boolean;
  showArms?: boolean;
  showLegs?: boolean;
}) {
  const s = rig.partScale;
  const chest = rig.sockets.chest;
  const hips = rig.sockets.hips;
  const compact = rig.id === "body_03";
  const tall = rig.id === "body_02";
  const torsoWide = compact ? 0.78 : tall ? 0.7 : 0.74;

  return (
    <group>
      {showTorso ? (
        <mesh position={chest} scale={s}>
          <capsuleGeometry args={[torsoWide, compact ? 0.85 : 1.05, 6, 10]} />
          <Lambert color={color} />
        </mesh>
      ) : null}
      {showArms ? (
        <>
          <mesh position={[chest[0] - 0.92 * s, chest[1] - 0.05 * s, chest[2]]} rotation={[0, 0, 0.22]} scale={s}>
            <capsuleGeometry args={[0.2, 0.72, 4, 8]} />
            <Lambert color={color} />
          </mesh>
          <mesh position={[chest[0] + 0.92 * s, chest[1] - 0.05 * s, chest[2]]} rotation={[0, 0, -0.22]} scale={s}>
            <capsuleGeometry args={[0.2, 0.72, 4, 8]} />
            <Lambert color={color} />
          </mesh>
        </>
      ) : null}
      <mesh position={[chest[0] - 1.08 * s, hips[1] + 0.55 * s, chest[2]]} scale={s}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <Lambert color={color} />
      </mesh>
      <mesh position={[chest[0] + 1.08 * s, hips[1] + 0.55 * s, chest[2]]} scale={s}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <Lambert color={color} />
      </mesh>
      {showLegs ? (
        <>
          <mesh position={[hips[0] - 0.28 * s, hips[1] - 0.55 * s, hips[2]]} scale={s}>
            <capsuleGeometry args={[0.2, 0.85, 4, 8]} />
            <Lambert color={color} />
          </mesh>
          <mesh position={[hips[0] + 0.28 * s, hips[1] - 0.55 * s, hips[2]]} scale={s}>
            <capsuleGeometry args={[0.2, 0.85, 4, 8]} />
            <Lambert color={color} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

export function HairPart({ recipe, color }: { recipe: string; color: string }) {
  if (recipe === "hair_02") {
    return (
      <group>
        <mesh position={[0, 0.28, -0.06]} scale={[1.08, 0.52, 0.98]}>
          <sphereGeometry args={[0.68, 22, 18]} />
          <ToyHairMaterial color={color} />
        </mesh>
        <mesh position={[0.02, 0.58, 0]} scale={[0.42, 0.62, 0.4]}>
          <sphereGeometry args={[0.26, 16, 14]} />
          <ToyHairMaterial color={color} />
        </mesh>
        <mesh position={[-0.2, 0.52, 0.06]} scale={[0.36, 0.48, 0.34]}>
          <sphereGeometry args={[0.24, 14, 12]} />
          <ToyHairMaterial color={color} />
        </mesh>
        <mesh position={[0.22, 0.5, 0.08]} scale={[0.34, 0.44, 0.32]}>
          <sphereGeometry args={[0.22, 14, 12]} />
          <ToyHairMaterial color={color} />
        </mesh>
        <mesh position={[0.1, 0.42, -0.24]} scale={[0.4, 0.36, 0.36]}>
          <sphereGeometry args={[0.2, 14, 12]} />
          <ToyHairMaterial color={color} />
        </mesh>
      </group>
    );
  }
  if (recipe === "hair_03") {
    return (
      <group>
        <mesh position={[0, 0.16, -0.06]} scale={[1.02, 0.58, 0.86]}>
          <sphereGeometry args={[0.7, 12, 10]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[-0.58, 0.42, -0.12]}>
          <sphereGeometry args={[0.28, 10, 8]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0.58, 0.42, -0.12]}>
          <sphereGeometry args={[0.28, 10, 8]} />
          <Lambert color={color} />
        </mesh>
      </group>
    );
  }
  if (recipe === "hair_04") {
    return (
      <group>
        <mesh position={[0, 0.14, -0.04]} scale={[1.06, 0.6, 0.88]}>
          <sphereGeometry args={[0.7, 12, 10]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0, -0.28, -0.28]} scale={[0.95, 1.15, 0.7]}>
          <sphereGeometry args={[0.55, 10, 8]} />
          <Lambert color={color} />
        </mesh>
      </group>
    );
  }
  if (recipe === "hair_05") {
    return (
      <group>
        <mesh position={[0, 0.28, -0.02]}>
          <sphereGeometry args={[0.78, 12, 10]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[-0.38, 0.18, 0.08]} scale={0.72}>
          <sphereGeometry args={[0.55, 10, 8]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0.38, 0.18, 0.08]} scale={0.72}>
          <sphereGeometry args={[0.55, 10, 8]} />
          <Lambert color={color} />
        </mesh>
      </group>
    );
  }
  if (recipe === "hair_06") {
    return (
      <group>
        <mesh position={[0, 0.12, -0.02]} scale={[1.04, 0.55, 0.86]}>
          <sphereGeometry args={[0.7, 12, 10]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0.28, 0.06, 0.22]} rotation={[0.2, -0.4, 0.3]} scale={[0.85, 0.45, 0.7]}>
          <sphereGeometry args={[0.42, 10, 8]} />
          <Lambert color={color} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={[0, 0.1, -0.04]} scale={[1.04, 0.52, 0.86]}>
      <sphereGeometry args={[0.7, 12, 10]} />
      <Lambert color={color} />
    </mesh>
  );
}

export function TopPart({ recipe, color }: { recipe: string; color: string }) {
  if (recipe === "top_02") {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1.72, 1.42, 1.02]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0, 0.72, -0.08]} rotation={[0.35, 0, 0]}>
          <torusGeometry args={[0.42, 0.16, 8, 14, Math.PI]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[-0.98, 0.05, 0]} rotation={[0, 0, 0.18]}>
          <capsuleGeometry args={[0.26, 0.7, 4, 8]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0.98, 0.05, 0]} rotation={[0, 0, -0.18]}>
          <capsuleGeometry args={[0.26, 0.7, 4, 8]} />
          <Lambert color={color} />
        </mesh>
      </group>
    );
  }
  if (recipe === "top_03") {
    return (
      <mesh>
        <boxGeometry args={[1.42, 1.22, 0.88]} />
        <Lambert color={color} />
      </mesh>
    );
  }
  if (recipe === "top_04") {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1.78, 1.48, 1.08]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[-1.02, -0.08, 0]} rotation={[0, 0, 0.12]}>
          <capsuleGeometry args={[0.3, 0.86, 4, 8]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[1.02, -0.08, 0]} rotation={[0, 0, -0.12]}>
          <capsuleGeometry args={[0.3, 0.86, 4, 8]} />
          <Lambert color={color} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.62, 1.28, 0.96]} />
        <Lambert color={color} />
      </mesh>
      <mesh position={[-0.92, 0.18, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.22, 0.42, 4, 8]} />
        <Lambert color={color} />
      </mesh>
      <mesh position={[0.92, 0.18, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.22, 0.42, 4, 8]} />
        <Lambert color={color} />
      </mesh>
    </group>
  );
}

export function BottomPart({ recipe, color }: { recipe: string; color: string }) {
  if (recipe === "bottom_02") {
    return (
      <group>
        <mesh position={[-0.28, -0.15, 0]}>
          <capsuleGeometry args={[0.28, 1.05, 4, 8]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0.28, -0.15, 0]}>
          <capsuleGeometry args={[0.28, 1.05, 4, 8]} />
          <Lambert color={color} />
        </mesh>
      </group>
    );
  }
  if (recipe === "bottom_03") {
    return (
      <mesh position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.85, 0.82, 10]} />
        <Lambert color={color} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh position={[-0.32, 0, 0]}>
        <boxGeometry args={[0.62, 0.62, 0.78]} />
        <Lambert color={color} />
      </mesh>
      <mesh position={[0.32, 0, 0]}>
        <boxGeometry args={[0.62, 0.62, 0.78]} />
        <Lambert color={color} />
      </mesh>
    </group>
  );
}

export function ShoesPart({ recipe, color }: { recipe: string; color: string }) {
  const height = recipe === "shoes_02" ? 0.48 : recipe === "shoes_03" ? 0.2 : 0.32;
  const depth = recipe === "shoes_03" ? 0.72 : 0.92;
  return (
    <group>
      <mesh position={[-0.3, height / 2, 0.12]}>
        <boxGeometry args={[0.52, height, depth]} />
        <Lambert color={color} />
      </mesh>
      <mesh position={[0.3, height / 2, 0.12]}>
        <boxGeometry args={[0.52, height, depth]} />
        <Lambert color={color} />
      </mesh>
    </group>
  );
}

export function AccessoryPart({ recipe, color }: { recipe: string; color: string }) {
  if (recipe === "accessory_02") {
    return (
      <group>
        <mesh position={[0, 0, -0.08]}>
          <boxGeometry args={[0.85, 0.95, 0.42]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[-0.28, 0.55, 0.18]} rotation={[0.4, 0, 0.15]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
          <Lambert color="#2b3a67" />
        </mesh>
        <mesh position={[0.28, 0.55, 0.18]} rotation={[0.4, 0, -0.15]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
          <Lambert color="#2b3a67" />
        </mesh>
      </group>
    );
  }
  if (recipe === "accessory_03") {
    return (
      <group>
        <mesh position={[-0.12, 0, 0]} rotation={[0, 0, 0.7]}>
          <coneGeometry args={[0.16, 0.28, 6]} />
          <Lambert color={color} />
        </mesh>
        <mesh position={[0.12, 0, 0]} rotation={[0, 0, -0.7]}>
          <coneGeometry args={[0.16, 0.28, 6]} />
          <Lambert color={color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.07, 8, 8]} />
          <Lambert color="#f5c542" />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[-0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.025, 8, 14]} />
        <Lambert color="#1e293b" />
      </mesh>
      <mesh position={[0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.025, 8, 14]} />
        <Lambert color="#1e293b" />
      </mesh>
      <mesh>
        <boxGeometry args={[0.16, 0.03, 0.03]} />
        <Lambert color="#1e293b" />
      </mesh>
    </group>
  );
}
