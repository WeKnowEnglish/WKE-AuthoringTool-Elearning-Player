import { TOY_HEAD_HERO_ID } from "./kit-types";

export const HERO_PUBLIC_ROOT = "/characters/heroes";

export type CharacterHeroKind = "procedural" | "glb";

export type CharacterHeroPreview = "head" | "body";

export type CharacterHeroDef = {
  id: string;
  name: string;
  kind: CharacterHeroKind;
  /** Public URL for a generated or authored GLB. */
  src?: string;
  targetHeight?: number;
  /** Uniform scale when bbox-fit is wrong (skinned Mixamo seeds). */
  previewScale?: number;
  /** Generated image-to-3D meshes already include a painted face. */
  includesFace?: boolean;
  includesHair?: boolean;
  /** Keep false for textured image-to-3D heroes so the bake stays. */
  tintSkin?: boolean;
  /** Multiply only the Hair mesh; face albedo stays painted. */
  tintHair?: boolean;
  /** GLB has a named Hair child that can be hidden. */
  hasSeparateHair?: boolean;
  /** Kit preview framing. Full-body seeds need a pulled-back camera. */
  preview?: CharacterHeroPreview;
};

/**
 * Locked hero cages the kit can evaluate.
 * `hero_kid_v1` is the compiled output of the local mesh builder
 * (`npm run character:build-hero`).
 */
export const HERO_ASSETS: CharacterHeroDef[] = [
  {
    id: TOY_HEAD_HERO_ID,
    name: "Toy procedural",
    kind: "procedural",
    includesFace: false,
    includesHair: false,
    tintSkin: true,
  },
  {
    id: "hero_kid_v1",
    name: "Image hero",
    kind: "glb",
    src: `${HERO_PUBLIC_ROOT}/hero_kid_v1.glb`,
    targetHeight: 1.6,
    includesFace: true,
    includesHair: true,
    tintSkin: false,
  },
  {
    id: "seed_boy",
    name: "Seed boy (raw GLB)",
    kind: "glb",
    src: `${HERO_PUBLIC_ROOT}/seed_boy.glb`,
    previewScale: 0.34,
    includesFace: true,
    includesHair: true,
    tintSkin: false,
    preview: "body",
  },
  {
    id: "seed_boy_head",
    name: "Seed boy head",
    kind: "glb",
    src: `${HERO_PUBLIC_ROOT}/seed_boy_head.glb?v=14`,
    targetHeight: 1.35,
    includesFace: true,
    includesHair: true,
    tintSkin: false,
    preview: "head",
  },
];

export function findHero(id: string): CharacterHeroDef {
  return HERO_ASSETS.find((item) => item.id === id) ?? HERO_ASSETS[0]!;
}

export function isRegisteredHero(id: string): boolean {
  return HERO_ASSETS.some((item) => item.id === id);
}

export function heroGlbPublicSrc(id: string): string {
  return `${HERO_PUBLIC_ROOT}/${id}.glb`;
}
