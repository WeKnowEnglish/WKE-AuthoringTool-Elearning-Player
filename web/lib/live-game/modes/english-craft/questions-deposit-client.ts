import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";

export type EnglishCraftDepositSpellClient = {
  resourceType: LiveGameResourceType;
  spellHint: string;
  storageLabel: string;
};

export const ENGLISH_CRAFT_DEPOSIT_SPELL_PREVIEW: EnglishCraftDepositSpellClient = {
  resourceType: "wood",
  spellHint: "Loading spell challenge...",
  storageLabel: "Storage",
};
