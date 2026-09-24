import { HAIR_SWATCHES, SKIN_SWATCHES, isKnownSwatch } from "@/lib/character/character-assets";
import type { CharacterSwatch, Vec3 } from "@/lib/character/character-types";
import { cloneHair } from "./hair-shell";
import { isRegisteredHero } from "./hero-assets";
import { isLegacyToyProfile, normalizeHeadProfile, parseProfileRings } from "./head-profile";
import { DEFAULT_CHARACTER_KIT } from "./kit-defaults";
import {
  CHARACTER_KIT_FORMAT,
  CHARACTER_KIT_VERSION,
  TOY_HEAD_HERO_ID,
  type CharacterKitDocument,
  type KitHair,
  type KitHairTuft,
  type KitMouthExpression,
} from "./kit-types";
import { cloneSculptStrokes, parseSculptStrokes } from "./sculpt-strokes";

function num(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function hex(value: unknown, swatches: CharacterSwatch[], fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (isKnownSwatch(swatches, trimmed)) {
    return swatches.find((item) => item.hex.toLowerCase() === trimmed.toLowerCase())?.hex ?? fallback;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return fallback;
}

function vec3(value: unknown, fallback: Vec3): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) return fallback;
  return [
    num(value[0], fallback[0], -2, 2),
    num(value[1], fallback[1], -2, 2),
    num(value[2], fallback[2], -2, 2),
  ];
}

function expression(value: unknown): KitMouthExpression {
  if (value === "cheer" || value === "wow" || value === "smile") return value;
  return DEFAULT_CHARACTER_KIT.mouth.expression;
}

type LegacyHairCap = { height?: number; radius?: number; back?: number };
type LegacyHairClump = { id?: string; position?: unknown; radius?: number; puff?: number; length?: number; tilt?: unknown };

function tuftFromUnknown(value: unknown, index: number, fallback: KitHairTuft): KitHairTuft {
  const raw = value && typeof value === "object" ? (value as LegacyHairClump) : {};
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `tuft_${index + 1}`;
  const puffLength = typeof raw.puff === "number" && Number.isFinite(raw.puff) ? raw.puff * 0.12 : fallback.length;
  return {
    id,
    position: vec3(raw.position, fallback.position),
    radius: num(raw.radius, fallback.radius, 0.03, 0.4),
    length: num(raw.length, puffLength, 0.04, 0.6),
    tilt: vec3(raw.tilt, fallback.tilt),
  };
}

function normalizeHair(raw: unknown): KitHair {
  const hair = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cap = hair.cap && typeof hair.cap === "object" ? (hair.cap as LegacyHairCap) : null;
  const fallback = DEFAULT_CHARACTER_KIT.hair;
  const hasNewShape =
    typeof hair.hairlineY === "number" || Array.isArray(hair.tufts) || Array.isArray(hair.shell);
  const hairlineFromCap = cap ? num(cap.height, fallback.hairlineY, 0.05, 0.9) * 0.65 : fallback.hairlineY;
  const tuftSource = Array.isArray(hair.tufts) ? hair.tufts : Array.isArray(hair.clumps) ? hair.clumps : null;
  const tufts = tuftSource
    ? tuftSource.map((item, index) =>
        tuftFromUnknown(item, index, fallback.tufts[index] ?? fallback.tufts[0] ?? createHairTuft(index)),
      )
    : fallback.tufts.map((item) => ({ ...item, position: [...item.position] as Vec3, tilt: [...item.tilt] as Vec3 }));

  const shell = parseProfileRings(hair.shell);

  return {
    hairlineY: num(hair.hairlineY, hasNewShape ? fallback.hairlineY : hairlineFromCap, -0.2, 0.7),
    overshoot: num(hair.overshoot, fallback.overshoot, 0, 0.25),
    backBias: num(hair.backBias, cap ? num(cap.back, fallback.backBias, -0.4, 0.15) : fallback.backBias, -0.4, 0.15),
    ...(shell ? { shell } : {}),
    tufts,
  };
}

export function normalizeCharacterKit(raw: unknown): CharacterKitDocument {
  const source = raw && typeof raw === "object" ? (raw as Partial<CharacterKitDocument>) : {};
  const legacySkull = isLegacyToyProfile(parseProfileRings(source.profile));
  const eyes = legacySkull ? DEFAULT_CHARACTER_KIT.eyes : source.eyes;
  const nose = legacySkull ? DEFAULT_CHARACTER_KIT.nose : source.nose;
  const mouth = legacySkull ? DEFAULT_CHARACTER_KIT.mouth : source.mouth;
  const ears = legacySkull ? DEFAULT_CHARACTER_KIT.ears : source.ears;

  return {
    format: CHARACTER_KIT_FORMAT,
    version: CHARACTER_KIT_VERSION,
    id: typeof source.id === "string" && source.id.trim() ? source.id.trim() : DEFAULT_CHARACTER_KIT.id,
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : DEFAULT_CHARACTER_KIT.name,
    hero:
      typeof source.hero === "string" && isRegisteredHero(source.hero)
        ? source.hero
        : TOY_HEAD_HERO_ID,
    skinColor: hex(source.skinColor, SKIN_SWATCHES, DEFAULT_CHARACTER_KIT.skinColor),
    hairColor: hex(source.hairColor, HAIR_SWATCHES, DEFAULT_CHARACTER_KIT.hairColor),
    regions: {
      crown: num(source.regions?.crown, DEFAULT_CHARACTER_KIT.regions.crown, 0, 2.4),
      cheeks: num(source.regions?.cheeks, DEFAULT_CHARACTER_KIT.regions.cheeks, 0, 2.4),
      chin: num(source.regions?.chin, DEFAULT_CHARACTER_KIT.regions.chin, 0, 2.4),
    },
    profile: legacySkull
      ? normalizeHeadProfile(DEFAULT_CHARACTER_KIT.profile)
      : normalizeHeadProfile(source.profile),
    sculpts: legacySkull
      ? cloneSculptStrokes(DEFAULT_CHARACTER_KIT.sculpts ?? [])
      : Array.isArray(source.sculpts)
        ? parseSculptStrokes(source.sculpts)
        : cloneSculptStrokes(DEFAULT_CHARACTER_KIT.sculpts ?? []),
    plateSrc: typeof source.plateSrc === "string" && source.plateSrc.trim() ? source.plateSrc.trim() : undefined,
    eyes: {
      spacing: num(eyes?.spacing, DEFAULT_CHARACTER_KIT.eyes.spacing, 0.2, 0.7),
      size: num(eyes?.size, DEFAULT_CHARACTER_KIT.eyes.size, 0.6, 1.6),
      height: num(eyes?.height, DEFAULT_CHARACTER_KIT.eyes.height, -0.2, 0.25),
      forward: num(eyes?.forward, DEFAULT_CHARACTER_KIT.eyes.forward, 0.4, 0.9),
      open: eyes?.open === true,
    },
    nose: {
      size: num(nose?.size, DEFAULT_CHARACTER_KIT.nose.size, 0.4, 2),
      height: num(nose?.height, DEFAULT_CHARACTER_KIT.nose.height, -0.3, 0.1),
      forward: num(nose?.forward, DEFAULT_CHARACTER_KIT.nose.forward, 0.5, 0.95),
    },
    mouth: {
      width: num(mouth?.width, DEFAULT_CHARACTER_KIT.mouth.width, 0.6, 1.8),
      height: num(mouth?.height, DEFAULT_CHARACTER_KIT.mouth.height, -0.45, -0.1),
      forward: num(mouth?.forward, DEFAULT_CHARACTER_KIT.mouth.forward, 0.45, 0.9),
      expression: expression(mouth?.expression),
    },
    ears: {
      size: num(ears?.size, DEFAULT_CHARACTER_KIT.ears.size, 0.5, 1.8),
    },
    hair: cloneHair(normalizeHair(source.hair)),
  };
}

export function createHairTuft(index = 0): KitHairTuft {
  return {
    id: `tuft_${Date.now()}_${index}`,
    position: [0, 0.72, 0],
    radius: 0.06,
    length: 0.16,
    tilt: [0.2, 0, 0],
  };
}
