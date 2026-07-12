import "server-only";

import type { LiveGameSessionState } from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  ENGLISH_CRAFT_RESOURCE_NODE_BY_ID,
  ENGLISH_CRAFT_STORAGE_BY_TYPE,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { resolveQuestionSetUuid } from "@/lib/live-game/question-banks/question-set-ids";
import type { LiveGameQuestionBank } from "@/lib/live-game/question-banks/types";
import type { LiveGameChallengeRecord } from "@/lib/live-game/server/challenge-store";
import {
  readSessionQuestionSetBinding,
  type SessionQuestionSetBinding,
} from "@/lib/live-game/server/question-set-session";

export type ChallengeQuestionSetContext = SessionQuestionSetBinding & {
  bank: LiveGameQuestionBank;
};

const STORAGE_IDS = new Set(
  Object.values(ENGLISH_CRAFT_STORAGE_BY_TYPE).map((storage) => storage.id),
);

export function inferQuestionBankFromNodeId(nodeId: string): LiveGameQuestionBank | null {
  if (nodeId in ENGLISH_CRAFT_RESOURCE_NODE_BY_ID) return "harvest";
  if (STORAGE_IDS.has(nodeId)) return "deposit";
  if (nodeId === ENGLISH_CRAFT_CRAFT_BENCH_ID) return "craft";
  return null;
}

export function readChallengeQuestionSetContext(
  session: LiveGameSessionState,
  challenge: LiveGameChallengeRecord,
): ChallengeQuestionSetContext {
  const sessionBinding = readSessionQuestionSetBinding(session);
  const ref = challenge.questionSetId ?? sessionBinding.ref;
  const setId = resolveQuestionSetUuid(ref) ?? ref;
  const bank =
    challenge.questionBank ??
    inferQuestionBankFromNodeId(challenge.nodeId) ??
    "harvest";

  return {
    ref,
    setId,
    version: challenge.questionSetVersion ?? sessionBinding.version,
    bank,
  };
}
