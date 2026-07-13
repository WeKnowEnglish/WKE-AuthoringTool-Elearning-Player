import "server-only";

import type {
  CraftSentencePayload,
  DepositSpellPayload,
  HarvestMcPayload,
  LiveGameQuestionBank,
  LiveGameQuestionRow,
  LiveGameQuestionSetSnapshot,
} from "@/lib/live-game/question-banks/types";

export function findQuestionInSnapshot(
  snapshot: LiveGameQuestionSetSnapshot,
  bank: LiveGameQuestionBank,
  questionId: string,
): LiveGameQuestionRow | null {
  const rows =
    bank === "harvest" ? snapshot.harvest
    : bank === "deposit" ? snapshot.deposit
    : snapshot.craft;
  return (
    rows.find(
      (row) => row.id === questionId || row.legacySourceId === questionId,
    ) ?? null
  );
}

export function getHarvestPayload(row: LiveGameQuestionRow): HarvestMcPayload {
  if (row.payload.type !== "multiple_choice") {
    throw new Error(`Expected harvest payload for ${row.id}`);
  }
  return row.payload;
}

export function getDepositPayload(row: LiveGameQuestionRow): DepositSpellPayload {
  if (row.payload.type !== "deposit_spell") {
    throw new Error(`Expected deposit payload for ${row.id}`);
  }
  return row.payload;
}

export function getCraftPayload(row: LiveGameQuestionRow): CraftSentencePayload {
  if (row.payload.type !== "drag_sentence") {
    throw new Error(`Expected craft payload for ${row.id}`);
  }
  return row.payload;
}
