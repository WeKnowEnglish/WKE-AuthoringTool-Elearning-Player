import type { CharacterConfig } from "@/lib/character/character-types";
import { DEFAULT_CHARACTER_KIT } from "./kit-defaults";
import { facePreset, hairPreset } from "./kit-presets";
import { normalizeCharacterKit } from "./kit-normalize";
import type { CharacterKitDocument } from "./kit-types";

type KitCompatibleColors = Pick<CharacterConfig, "skinColor" | "hairColor"> & {
  hair?: string;
  face?: string;
};

/**
 * Legacy procedural head adapter retained for the separate authoring pilot.
 * It is no longer consumed by the live student avatar.
 */
export function kitFromCharacterConfig(config: KitCompatibleColors): CharacterKitDocument {
  const hairId = config.hair?.startsWith("hair_") ? config.hair : "hair_02";
  const faceId = config.face?.startsWith("face_") ? config.face : "face_01";
  const hair = hairPreset(hairId) ?? DEFAULT_CHARACTER_KIT.hair;
  const face = facePreset(faceId);
  return normalizeCharacterKit({
    ...DEFAULT_CHARACTER_KIT,
    id: `student_${hairId}_${faceId}`,
    name: "Student head",
    skinColor: config.skinColor,
    hairColor: config.hairColor,
    eyes: {
      ...DEFAULT_CHARACTER_KIT.eyes,
      ...face.eyes,
      open: face.open,
    },
    nose: {
      ...DEFAULT_CHARACTER_KIT.nose,
      ...face.nose,
    },
    mouth: {
      ...DEFAULT_CHARACTER_KIT.mouth,
      ...face.mouth,
      width: face.mouthWidth,
      expression: face.expression,
    },
    hair,
  });
}
