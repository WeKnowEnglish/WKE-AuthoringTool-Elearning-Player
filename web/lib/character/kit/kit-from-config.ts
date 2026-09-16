import type { CharacterConfig } from "@/lib/character/character-types";
import { DEFAULT_CHARACTER_KIT } from "./kit-defaults";
import { facePreset, hairPreset } from "./kit-presets";
import { normalizeCharacterKit } from "./kit-normalize";
import type { CharacterKitDocument } from "./kit-types";

/** Student loadout → evaluated head kit. */
export function kitFromCharacterConfig(config: CharacterConfig): CharacterKitDocument {
  const hair = hairPreset(config.hair) ?? DEFAULT_CHARACTER_KIT.hair;
  const face = facePreset(config.face);
  return normalizeCharacterKit({
    ...DEFAULT_CHARACTER_KIT,
    id: `student_${config.hair}_${config.face}`,
    name: "Student head",
    skinColor: config.skinColor,
    hairColor: config.hairColor,
    eyes: { ...DEFAULT_CHARACTER_KIT.eyes, open: face.open },
    mouth: {
      ...DEFAULT_CHARACTER_KIT.mouth,
      width: face.mouthWidth,
      expression: face.expression,
    },
    hair,
  });
}
