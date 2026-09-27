import { studioPartSource } from "./character-studio";
import type {
  CharacterCategory,
  CharacterPartDef,
  CharacterSwatch,
} from "./character-types";

function part(
  category: CharacterCategory,
  id: string,
  name: string,
  fit: CharacterPartDef["fit"],
): CharacterPartDef {
  return { id, name, category, recipe: id, fit, unlock: "free" };
}

/**
 * Central catalog of student-facing options.
 * UI reads this file. To swap a placeholder for a Shape Builder export,
 * add `studio: studioPartSource(category, id, "Group Name")`.
 */
export const CHARACTER_ASSETS: Record<CharacterCategory, CharacterPartDef[]> = {
  body: [
    part("body", "body_01", "Classic", { socket: "origin", tint: "skin" }),
    part("body", "body_02", "Tall", { socket: "origin", tint: "skin" }),
    part("body", "body_03", "Compact", { socket: "origin", tint: "skin" }),
  ],
  hair: [
    part("hair", "hair_01", "Short cap", {
      socket: "head",
      offset: [0, 0.46, -0.04],
      tint: "hair",
      align: "bottom",
      targetHeight: 0.85,
    }),
    part("hair", "hair_02", "Spiky", {
      socket: "head",
      offset: [0, 0.5, -0.04],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.15,
    }),
    part("hair", "hair_03", "Buns", {
      socket: "head",
      offset: [0, 0.48, -0.06],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.05,
    }),
    part("hair", "hair_04", "Long", {
      socket: "head",
      offset: [0, 0.3, -0.1],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.45,
    }),
    part("hair", "hair_05", "Puff", {
      socket: "head",
      offset: [0, 0.54, -0.02],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.2,
    }),
    part("hair", "hair_06", "Side sweep", {
      socket: "head",
      offset: [0, 0.44, 0.02],
      tint: "hair",
      align: "bottom",
      targetHeight: 0.95,
    }),
    part("hair", "hair_07", "Fringe", {
      socket: "head",
      offset: [0, 0.42, 0.04],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.05,
    }),
    part("hair", "hair_08", "Bowl", {
      socket: "head",
      offset: [0, 0.4, -0.02],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.0,
    }),
    part("hair", "hair_09", "Twintails", {
      socket: "head",
      offset: [0, 0.36, -0.08],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.35,
    }),
    part("hair", "hair_10", "Fluffy", {
      socket: "head",
      offset: [0, 0.5, -0.04],
      tint: "hair",
      align: "bottom",
      targetHeight: 1.2,
    }),
  ],
  face: [
    part("face", "face_01", "Smile", { socket: "face", tint: "none", align: "center" }),
    part("face", "face_02", "Cheer", { socket: "face", tint: "none", align: "center" }),
    part("face", "face_03", "Wow", { socket: "face", tint: "none", align: "center" }),
    part("face", "face_04", "Big eyes", { socket: "face", tint: "none", align: "center" }),
    part("face", "face_05", "Soft", { socket: "face", tint: "none", align: "center" }),
    part("face", "face_06", "Cheeky", { socket: "face", tint: "none", align: "center" }),
  ],
  top: [
    part("top", "top_01", "T-shirt", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.45,
    }),
    part("top", "top_02", "Hoodie", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.55,
    }),
    part("top", "top_03", "Tank", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.25,
    }),
    part("top", "top_04", "Sweater", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.5,
    }),
    part("top", "top_05", "Polo", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.4,
    }),
    part("top", "top_06", "Vest", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.28,
    }),
    part("top", "top_07", "Raincoat", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.7,
    }),
    part("top", "top_08", "Jersey", {
      socket: "chest",
      tint: "top",
      align: "center",
      targetHeight: 1.42,
    }),
  ],
  bottom: [
    part("bottom", "bottom_01", "Shorts", {
      socket: "hips",
      tint: "bottom",
      align: "center",
      targetHeight: 0.72,
    }),
    part("bottom", "bottom_02", "Pants", {
      socket: "hips",
      offset: [0, -0.35, 0],
      tint: "bottom",
      align: "center",
      targetHeight: 1.35,
    }),
    part("bottom", "bottom_03", "Skirt", {
      socket: "hips",
      offset: [0, -0.12, 0],
      tint: "bottom",
      align: "center",
      targetHeight: 0.85,
    }),
    part("bottom", "bottom_04", "Capris", {
      socket: "hips",
      offset: [0, -0.2, 0],
      tint: "bottom",
      align: "center",
      targetHeight: 1.05,
    }),
    part("bottom", "bottom_05", "Overalls", {
      socket: "hips",
      offset: [0, -0.2, 0],
      tint: "bottom",
      align: "center",
      targetHeight: 1.5,
    }),
    part("bottom", "bottom_06", "Culottes", {
      socket: "hips",
      offset: [0, -0.08, 0],
      tint: "bottom",
      align: "center",
      targetHeight: 0.9,
    }),
  ],
  shoes: [
    part("shoes", "shoes_01", "Sneakers", {
      socket: "feet",
      tint: "shoes",
      align: "bottom",
      targetHeight: 0.42,
    }),
    part("shoes", "shoes_02", "Boots", {
      socket: "feet",
      tint: "shoes",
      align: "bottom",
      targetHeight: 0.58,
    }),
    part("shoes", "shoes_03", "Flats", {
      socket: "feet",
      tint: "shoes",
      align: "bottom",
      targetHeight: 0.28,
    }),
    part("shoes", "shoes_04", "High tops", {
      socket: "feet",
      tint: "shoes",
      align: "bottom",
      targetHeight: 0.5,
    }),
    part("shoes", "shoes_05", "Sandals", {
      socket: "feet",
      tint: "shoes",
      align: "bottom",
      targetHeight: 0.24,
    }),
    part("shoes", "shoes_06", "Rain boots", {
      socket: "feet",
      tint: "shoes",
      align: "bottom",
      targetHeight: 0.7,
    }),
  ],
  accessory: [
    part("accessory", "accessory_01", "Glasses", {
      socket: "face",
      offset: [0, 0.08, 0.08],
      tint: "none",
      align: "center",
      targetHeight: 0.22,
    }),
    part("accessory", "accessory_02", "Backpack", {
      socket: "back",
      tint: "top",
      align: "center",
      targetHeight: 0.85,
    }),
    part("accessory", "accessory_03", "Bow", {
      socket: "head",
      offset: [0.42, 0.42, 0.08],
      tint: "top",
      align: "center",
      targetHeight: 0.28,
    }),
    part("accessory", "accessory_04", "Cap", {
      socket: "head",
      offset: [0, 0.52, 0.05],
      tint: "top",
      align: "center",
      targetHeight: 0.35,
    }),
    part("accessory", "accessory_05", "Headphones", {
      socket: "head",
      offset: [0, 0.28, 0],
      tint: "none",
      align: "center",
      targetHeight: 0.4,
    }),
    part("accessory", "accessory_06", "Scarf", {
      socket: "chest",
      offset: [0, 0.55, 0.05],
      tint: "top",
      align: "center",
      targetHeight: 0.35,
    }),
  ],
};

export const SKIN_SWATCHES: CharacterSwatch[] = [
  { id: "skin_light", name: "Light", hex: "#F1C7A8" },
  { id: "skin_medium_light", name: "Medium light", hex: "#E0A67C" },
  { id: "skin_medium", name: "Medium", hex: "#C98A63" },
  { id: "skin_medium_dark", name: "Medium dark", hex: "#8D5A3C" },
  { id: "skin_dark", name: "Dark", hex: "#5C3A24" },
];

export const HAIR_SWATCHES: CharacterSwatch[] = [
  { id: "hair_black", name: "Black", hex: "#1A1410" },
  { id: "hair_dark_brown", name: "Dark brown", hex: "#3B2618" },
  { id: "hair_brown", name: "Brown", hex: "#6B3F24" },
  { id: "hair_blond", name: "Blond", hex: "#D4B06A" },
  { id: "hair_red", name: "Red", hex: "#A33B24" },
];

export const CLOTHING_SWATCHES: CharacterSwatch[] = [
  { id: "wke_purple", name: "Purple", hex: "#635BFF" },
  { id: "wke_teal", name: "Teal", hex: "#2BB8A8" },
  { id: "wke_coral", name: "Coral", hex: "#FF6B6B" },
  { id: "wke_gold", name: "Gold", hex: "#F5C542" },
  { id: "wke_navy", name: "Navy", hex: "#2B3A67" },
  { id: "wke_leaf", name: "Leaf", hex: "#3D9B5C" },
];

export const NONE_ACCESSORY_ID = "none";

export function partsForCategory(category: CharacterCategory): CharacterPartDef[] {
  return CHARACTER_ASSETS[category];
}

export function findPart(category: CharacterCategory, id: string | null): CharacterPartDef | null {
  if (!id || id === NONE_ACCESSORY_ID) return null;
  return CHARACTER_ASSETS[category].find((item) => item.id === id) ?? null;
}

export function isRegisteredPart(category: CharacterCategory, id: string): boolean {
  return CHARACTER_ASSETS[category].some((item) => item.id === id);
}

export function swatchesForTint(tint: CharacterPartDef["fit"]["tint"]): CharacterSwatch[] {
  if (tint === "skin") return SKIN_SWATCHES;
  if (tint === "hair") return HAIR_SWATCHES;
  if (tint === "top" || tint === "bottom" || tint === "shoes") return CLOTHING_SWATCHES;
  return [];
}

export function isKnownSwatch(swatches: CharacterSwatch[], hex: string): boolean {
  return swatches.some((item) => item.hex.toLowerCase() === hex.toLowerCase());
}

/** Example of wiring a studio file. Unused until a GLB is dropped in public/. */
export const STUDIO_PART_EXAMPLE = studioPartSource("hair", "hair_02", "Hair");
