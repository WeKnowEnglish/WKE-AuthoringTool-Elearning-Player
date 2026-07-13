import "server-only";

import { clientQuestionId } from "@/lib/live-game/question-banks/client-payloads";
import type { LiveGameQuestionSetSnapshot } from "@/lib/live-game/question-banks/types";
import type { LiveGameSafeQuestionBundle } from "@/lib/live-game/question-bundle";

export function buildSafeLiveGameQuestionBundle(input: {
  roomId: string;
  questionSetId: string;
  questionSetVersion: number;
  snapshot: LiveGameQuestionSetSnapshot;
}): LiveGameSafeQuestionBundle {
  return {
    roomId: input.roomId,
    questionSetId: input.questionSetId,
    questionSetVersion: input.questionSetVersion,
    harvest: input.snapshot.harvest.map((row) => ({
      id: row.id,
      clientId: clientQuestionId(row),
      prompt: row.prompt,
      options: row.payload.type === "multiple_choice" ? row.payload.options : [],
    })),
    deposit: input.snapshot.deposit.map((row) => ({
      id: row.id,
      clientId: clientQuestionId(row),
      prompt: row.prompt,
      spellHint: row.payload.type === "deposit_spell" ? row.payload.spellHint : "",
      slotCount: row.payload.type === "deposit_spell" ? [...row.payload.targetWord].length : 0,
    })),
    craft: input.snapshot.craft.map((row) => ({
      id: row.id,
      clientId: clientQuestionId(row),
      prompt: row.prompt,
      wordBank: row.payload.type === "drag_sentence" ? row.payload.wordBank : [],
      slotCount: row.payload.type === "drag_sentence" ? row.payload.slotCount : 0,
    })),
  };
}
