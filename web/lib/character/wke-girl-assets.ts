import type { CharacterSwatch } from "./character-types";

export const WKE_GIRL_SKELETON_ID = "tripo-mixamo-v1" as const;
export const WKE_GIRL_SOURCE_HEIGHT = 0.99951171875;
export const WKE_GIRL_MODEL_HEIGHT = 4.9;

export type WkeGirlPartOption = {
  id: string;
  name: string;
  slot: "hair" | "outfit";
  source: "fused" | "glb";
  src?: string;
  skeleton: typeof WKE_GIRL_SKELETON_ID;
};

export const WKE_GIRL_BASES = [
  {
    id: "wke_girl_v1",
    name: "WKE Girl",
    src: "/characters/wke-girl/wke-girl-base-v1.glb",
    meshName: "f088de69_1334_475d_9d9a_e94b73a09c04",
    skeletonRoot: "mixamorig:Hips",
    skeleton: WKE_GIRL_SKELETON_ID,
  },
] as const;

export const WKE_GIRL_HAIR: WkeGirlPartOption[] = [
  {
    id: "wke_girl_hair_original",
    name: "Original curls",
    slot: "hair",
    source: "fused",
    skeleton: WKE_GIRL_SKELETON_ID,
  },
];

export const WKE_GIRL_OUTFITS: WkeGirlPartOption[] = [
  {
    id: "wke_girl_outfit_original",
    name: "School outfit",
    slot: "outfit",
    source: "fused",
    skeleton: WKE_GIRL_SKELETON_ID,
  },
];

export const WKE_GIRL_BASE = WKE_GIRL_BASES[0];
export const WKE_GIRL_DEFAULT_HAIR = WKE_GIRL_HAIR[0]!;
export const WKE_GIRL_DEFAULT_OUTFIT = WKE_GIRL_OUTFITS[0]!;

export const WKE_GIRL_SKIN_SWATCHES: CharacterSwatch[] = [
  { id: "skin_original", name: "Original", hex: "#E98D63" },
  { id: "skin_light", name: "Light", hex: "#F1C7A8" },
  { id: "skin_medium_light", name: "Medium light", hex: "#E0A67C" },
  { id: "skin_medium", name: "Medium", hex: "#C98A63" },
  { id: "skin_medium_dark", name: "Medium dark", hex: "#8D5A3C" },
  { id: "skin_dark", name: "Dark", hex: "#5C3A24" },
];

export const WKE_GIRL_HAIR_SWATCHES: CharacterSwatch[] = [
  { id: "hair_original", name: "Original brown", hex: "#4D2D22" },
  { id: "hair_black", name: "Black", hex: "#1A1410" },
  { id: "hair_dark_brown", name: "Dark brown", hex: "#3B2618" },
  { id: "hair_brown", name: "Brown", hex: "#7B4828" },
  { id: "hair_blond", name: "Blond", hex: "#D4B06A" },
  { id: "hair_red", name: "Red", hex: "#A33B24" },
];

export const WKE_GIRL_OUTFIT_SWATCHES: CharacterSwatch[] = [
  { id: "outfit_original_purple", name: "Original purple", hex: "#712FA6" },
  { id: "wke_purple", name: "Purple", hex: "#635BFF" },
  { id: "wke_teal", name: "Teal", hex: "#2BB8A8" },
  { id: "wke_coral", name: "Coral", hex: "#FF6B6B" },
  { id: "wke_gold", name: "Gold", hex: "#F5C542" },
  { id: "wke_navy", name: "Navy", hex: "#2B3A67" },
  { id: "wke_leaf", name: "Leaf", hex: "#3D9B5C" },
];

export const WKE_GIRL_CUSTOMIZATION_CATEGORIES = ["hair", "outfit", "skin"] as const;
export type WkeGirlCustomizationCategory =
  (typeof WKE_GIRL_CUSTOMIZATION_CATEGORIES)[number];

export function isWkeGirlBase(id: unknown): id is string {
  return typeof id === "string" && WKE_GIRL_BASES.some((item) => item.id === id);
}

export function isWkeGirlHair(id: unknown): id is string {
  return typeof id === "string" && WKE_GIRL_HAIR.some((item) => item.id === id);
}

export function isWkeGirlOutfit(id: unknown): id is string {
  return typeof id === "string" && WKE_GIRL_OUTFITS.some((item) => item.id === id);
}

export function findWkeGirlHair(id: string): WkeGirlPartOption {
  return WKE_GIRL_HAIR.find((item) => item.id === id) ?? WKE_GIRL_DEFAULT_HAIR;
}

export function findWkeGirlOutfit(id: string): WkeGirlPartOption {
  return WKE_GIRL_OUTFITS.find((item) => item.id === id) ?? WKE_GIRL_DEFAULT_OUTFIT;
}

export function isKnownWkeGirlSwatch(swatches: CharacterSwatch[], value: unknown): value is string {
  return (
    typeof value === "string" &&
    (swatches.some((item) => item.hex.toLowerCase() === value.toLowerCase()) ||
      /^#[0-9a-fA-F]{6}$/.test(value))
  );
}
