import "server-only";

import { createHash } from "node:crypto";
import type { LiveGameServerTimingContext } from "@/lib/live-game/server/server-timing";

export type LiveGameAnswerRouteType = "harvest" | "deposit" | "craft";

export type AnswerTimingCounters = {
  liveblocksReadCount: number;
  liveblocksMutateCount: number;
  supabaseQueryCount: number;
  rpcCount: number;
};

export function createAnswerTimingCounters(): AnswerTimingCounters {
  return {
    liveblocksReadCount: 0,
    liveblocksMutateCount: 0,
    supabaseQueryCount: 0,
    rpcCount: 0,
  };
}

export function hashChallengeIdForDiagnostic(challengeId: string): string {
  return createHash("sha256").update(challengeId).digest("hex").slice(0, 12);
}

export function answerTimingContext(input: {
  routeType: LiveGameAnswerRouteType;
  challengeId: string;
  counters: AnswerTimingCounters;
  idempotencyOutcome?: string;
  duplicateSubmission?: boolean;
  correctnessSource?: string;
  responseStrategy?: string;
  responseBytes?: number;
  resultReadyMs?: number;
  gameplayCommittedMs?: number;
  reportingCommittedMs?: number;
}): LiveGameServerTimingContext {
  return {
    routeType: input.routeType,
    challengeIdHash: hashChallengeIdForDiagnostic(input.challengeId),
    idempotencyOutcome: input.idempotencyOutcome,
    duplicateSubmission: input.duplicateSubmission,
    liveblocksReadCount: input.counters.liveblocksReadCount,
    liveblocksMutateCount: input.counters.liveblocksMutateCount,
    supabaseQueryCount: input.counters.supabaseQueryCount,
    rpcCount: input.counters.rpcCount,
    correctnessSource: input.correctnessSource,
    responseStrategy: input.responseStrategy,
    responseBytes: input.responseBytes,
    resultReadyMs: input.resultReadyMs,
    gameplayCommittedMs: input.gameplayCommittedMs,
    reportingCommittedMs: input.reportingCommittedMs,
  };
}

export function jsonAnswerResponse(
  body: unknown,
  init?: ResponseInit,
): { response: Response; bytes: number } {
  const text = JSON.stringify(body);
  return {
    response: new Response(text, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    }),
    bytes: Buffer.byteLength(text, "utf8"),
  };
}
