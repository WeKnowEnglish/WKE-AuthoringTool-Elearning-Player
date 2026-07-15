import "server-only";

import { randomUUID } from "node:crypto";

import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import type { LiveGameQuestionRow } from "@/lib/live-game/question-banks/types";
import type { LiveGameChallengeRecord } from "@/lib/live-game/server/challenge-store";
import { getQuestionSetSnapshot } from "@/lib/live-game/server/question-set-resolver";
import {
  recordLiveGameQuestionAttempt,
  recordLiveGameQuestionEncounter,
  resolveLiveGameQuestionEncounter,
  finalizeLiveGameCorrectAnswer,
} from "@/lib/live-game/server/report-repository";

export async function recordCurrentLiveGameEncounter(input: {
  storage: LiveGameStorageSnapshot;
  challenge: LiveGameChallengeRecord;
  question: LiveGameQuestionRow;
  resourceType?: string | null;
  recipeId?: string | null;
}) {
  const questionSet = await getQuestionSetSnapshot(
    input.challenge.questionSetId ?? input.storage.session.questionSetId,
    input.challenge.questionSetVersion ?? input.storage.session.questionSetVersion,
  );
  await recordLiveGameQuestionEncounter({
    storage: input.storage,
    questionSet,
    challengeId: input.challenge.challengeId,
    playerId: input.challenge.playerId,
    question: input.question,
    gameObjectId: input.challenge.nodeId,
    resourceType: input.resourceType,
    recipeId: input.recipeId,
  });
}

export async function recordCurrentLiveGameAttempt(input: {
  challengeId: string;
  submissionId: string;
  selectedAnswer: unknown;
  correct: boolean;
  responseTimeMs: number | null;
  contribution?: Record<string, unknown>;
}) {
  await recordLiveGameQuestionAttempt(input);
}

export async function finalizeCurrentLiveGameCorrectAnswer(input: {
  challengeId: string;
  submissionId: string;
  selectedAnswer: unknown;
  responseTimeMs: number | null;
  contribution?: Record<string, unknown>;
}) {
  await finalizeLiveGameCorrectAnswer(input);
}

export async function recordCurrentLiveGameSkip(challengeId: string) {
  await resolveLiveGameQuestionEncounter(challengeId, "skipped");
}

export function normalizeLiveGameSubmission(
  submissionId: unknown,
  responseTimeMs: unknown,
) {
  const id =
    typeof submissionId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)
      ? submissionId
      : randomUUID();
  const responseTime =
    typeof responseTimeMs === "number" && Number.isFinite(responseTimeMs)
      ? Math.min(Math.max(Math.round(responseTimeMs), 0), 60 * 60 * 1000)
      : null;
  return { id, responseTimeMs: responseTime };
}
