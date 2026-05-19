export const AVATAR_SLOTS = [
  "hair",
  "top",
  "bottom",
  "shoes",
  "hat",
  "accessory",
] as const;

export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

/** Equipped item ids per slot (without the `item-{slot}-` prefix). */
export type AvatarLoadout = {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  hat: string | null;
  accessory: string | null;
};

export type AvatarPresetId = "fox" | "robot" | "alien";
