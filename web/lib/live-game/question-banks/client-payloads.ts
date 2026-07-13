import "server-only";

import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import type { EnglishCraftCraftQuestionClient } from "@/lib/live-game/modes/english-craft/questions-client";
import type { EnglishCraftDepositSpellClient } from "@/lib/live-game/modes/english-craft/questions-deposit-client";
import { toClientDepositSpell } from "@/lib/live-game/modes/english-craft/questions-v1";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import {
  getCraftPayload,
  getDepositPayload,
  getHarvestPayload,
} from "@/lib/live-game/server/question-set-snapshot";
import type { LiveGameQuestionRow } from "@/lib/live-game/question-banks/types";

export function clientQuestionId(row: LiveGameQuestionRow): string {
  return row.legacySourceId ?? row.id;
}

export function toClientMcQuestionFromRow(
  row: LiveGameQuestionRow,
  shuffleSeed?: string,
): {
  id: string;
  type: "multiple_choice";
  prompt: string;
  options: string[];
} {
  const payload = getHarvestPayload(row);
  const options =
    shuffleSeed ?
      shuffleWithSeed(payload.options, `${shuffleSeed}:mc-options`)
    : payload.options;
  return {
    id: clientQuestionId(row),
    type: "multiple_choice",
    prompt: row.prompt,
    options,
  };
}

export function toClientCraftQuestionFromRow(
  row: LiveGameQuestionRow,
  shuffleSeed?: string,
): EnglishCraftCraftQuestionClient {
  const payload = getCraftPayload(row);
  const wordBank =
    shuffleSeed ?
      shuffleWithSeed(payload.wordBank, `${shuffleSeed}:craft-bank`)
    : payload.wordBank;
  return {
    id: clientQuestionId(row),
    type: "drag_sentence",
    prompt: row.prompt,
    wordBank,
    slotCount: payload.slotCount,
  };
}

export function toClientDepositSpellFromRow(
  row: LiveGameQuestionRow,
  input: {
    resourceType: LiveGameResourceType;
    storageLabel: string;
    shuffleSeed: string;
  },
): EnglishCraftDepositSpellClient {
  const payload = getDepositPayload(row);
  return toClientDepositSpell({
    resourceType: input.resourceType,
    spellHint: payload.spellHint,
    storageLabel: input.storageLabel,
    targetWord: payload.targetWord,
    shuffleSeed: input.shuffleSeed,
  });
}
