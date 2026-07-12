import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";

export type EnglishCraftDepositSpellClient = {
  resourceType: LiveGameResourceType;
  spellHint: string;
  storageLabel: string;
  letterBank: string[];
  slotCount: number;
  /** Per-slot correct letters for tile lock-in and hints (not the full target word string). */
  answerLetters: string[];
};

export const ENGLISH_CRAFT_DEPOSIT_SPELL_PREVIEW: EnglishCraftDepositSpellClient = {
  resourceType: "wood",
  spellHint: "Loading spell challenge...",
  storageLabel: "Storage",
  letterBank: [],
  slotCount: 0,
  answerLetters: [],
};
