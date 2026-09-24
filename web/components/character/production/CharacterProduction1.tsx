"use client";

import { getBodyRig } from "@/lib/character/character-rig";
import {
  CHARACTER_PRODUCTION_1_CONFIG,
  CHARACTER_PRODUCTION_1_KIT,
} from "@/lib/character/production/character-production-1";
import { CharacterKitHead } from "../kit/CharacterKitHead";
import { VinylKidBody } from "./VinylKidBody";

type Props = {
  scale?: number;
};

/**
 * Locked vinyl full-body figure. Head is the kit lathe; body is authored
 * capsules so clothes match the toy skull instead of the student boxes.
 */
export function CharacterProduction1({ scale = 1 }: Props) {
  const config = CHARACTER_PRODUCTION_1_CONFIG;
  const kit = CHARACTER_PRODUCTION_1_KIT;
  const rig = getBodyRig(config.body);

  return (
    <group name="characterProduction1" scale={scale}>
      <VinylKidBody config={config} rig={rig} />
      <group
        position={[rig.sockets.head[0], rig.sockets.head[1] - 0.06, rig.sockets.head[2] + 0.03]}
        scale={rig.partScale * 0.82}
      >
        <CharacterKitHead kit={kit} showFace showHair />
      </group>
    </group>
  );
}
