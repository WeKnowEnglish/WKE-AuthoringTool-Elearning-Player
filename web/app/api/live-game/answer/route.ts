import { NextResponse } from "next/server";
import {
  withLiveGameServerTiming,
  type LiveGameServerTimer,
} from "@/lib/live-game/server/server-timing";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { isHarvestAnswerCorrect } from "@/lib/live-game/server/question-set-resolver";
import { isHarvestAnswerCorrect as validateHarvestAnswer } from "@/lib/live-game/question-banks/schemas";
import {
  challengeMatchesQuestionBank,
  readChallengeQuestionSetContext,
} from "@/lib/live-game/server/question-set-challenge-context";
import { awardCarryForNode } from "@/lib/live-game/server/award-carry";
import { normalizeAwardReceipt } from "@/lib/live-game/server/award-receipt";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  releaseLiveGameChallengeAwardClaim,
  markChallengeSkipped,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_RESOURCE_NODE_BY_ID } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  finalizeCurrentLiveGameCorrectAnswer,
  normalizeLiveGameSubmission,
  recordCurrentLiveGameAttempt,
  recordCurrentLiveGameSkip,
} from "@/lib/live-game/server/report-evidence";
import {
  answerTimingContext,
  createAnswerTimingCounters,
  jsonAnswerResponse,
} from "@/lib/live-game/server/answer-timing";

type AnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  answer?: string;
  submissionId?: string;
  responseTimeMs?: number;
  skip?: boolean;
};

function parseAnswerBody(body: unknown): AnswerRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as AnswerRequestBody;
  if (typeof record.roomId !== "string" || typeof record.challengeId !== "string") {
    return null;
  }
  if (record.skip === true) {
    return {
      roomId: record.roomId,
      challengeId: record.challengeId,
      answer: typeof record.answer === "string" ? record.answer : "",
      submissionId: record.submissionId,
      responseTimeMs: record.responseTimeMs,
      skip: true,
    };
  }
  if (typeof record.answer !== "string") {
    return null;
  }
  return record;
}

function harvestCorrectPayload(input: {
  carryGranted?: { type: string; sourceNodeId: string } | null;
  nodeCooldownEndsAt?: number;
  alreadyAwarded?: boolean;
  poolTotal: ReturnType<typeof readResourcePool>;
}) {
  return {
    correct: true as const,
    carryGranted: input.carryGranted ?? null,
    resourceAwarded: null,
    poolTotal: input.poolTotal,
    nodeCooldownEndsAt: input.nodeCooldownEndsAt,
    alreadyAwarded: input.alreadyAwarded,
  };
}

function harvestIncorrectPayload(skipped = false) {
  return skipped ?
      { correct: false as const, skipped: true as const }
    : { correct: false as const };
}

async function handlePost(request: Request, timer: LiveGameServerTimer) {
  const requestStartedAt = performance.now();
  const counters = createAnswerTimingCounters();
  let resultReadyMs: number | undefined;
  let gameplayCommittedMs: number | undefined;
  let reportingCommittedMs: number | undefined;
  let correctnessSource: string | undefined;
  let responseStrategy = "pending";
  let idempotencyOutcome = "none";
  let duplicateSubmission = false;
  let challengeId = "";

  const finalizeContext = (bytes: number) => {
    timer.setContext(
      answerTimingContext({
        routeType: "harvest",
        challengeId: challengeId || "unknown",
        counters,
        idempotencyOutcome,
        duplicateSubmission,
        correctnessSource,
        responseStrategy,
        responseBytes: bytes,
        resultReadyMs,
        gameplayCommittedMs,
        reportingCommittedMs,
      }),
    );
  };

  try {
    assertLiveblocksSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liveblocks is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAnswerBody(body);
  if (!parsed?.roomId || !parsed.challengeId) {
    return NextResponse.json(
      { error: "roomId and challengeId are required." },
      { status: 400 },
    );
  }

  const roomId = parsed.roomId.trim();
  challengeId = parsed.challengeId.trim();
  const answer = (parsed.answer ?? "").trim();
  const skip = parsed.skip === true;
  const submission = normalizeLiveGameSubmission(parsed.submissionId, parsed.responseTimeMs);
  timer.setContext({ roomId, routeType: "harvest", challengeIdHash: answerTimingContext({
    routeType: "harvest",
    challengeId,
    counters,
  }).challengeIdHash });

  const playerId = (await timer.measure("auth", () => requireLiveGamePlayerSession(roomId))).playerId;

  const [challenge, storage] = await Promise.all([
    timer.measure("challenge_lookup", async () => {
      counters.supabaseQueryCount += 1;
      return getLiveGameChallenge(challengeId);
    }),
    timer.measure("liveblocks_read", async () => {
      counters.liveblocksReadCount += 1;
      return readLiveGameStorageJson(roomId);
    }),
  ]);
  if (!challenge) {
    const { response, bytes } = jsonAnswerResponse(
      { error: "Challenge expired or not found." },
      { status: 404 },
    );
    finalizeContext(bytes);
    return response;
  }
  if (challenge.roomId !== roomId || challenge.playerId !== playerId) {
    const { response, bytes } = jsonAnswerResponse({ error: "Challenge mismatch." }, { status: 403 });
    finalizeContext(bytes);
    return response;
  }
  if (!challengeMatchesQuestionBank(challenge, "harvest")) {
    const { response, bytes } = jsonAnswerResponse(
      { error: "Invalid harvest challenge." },
      { status: 403 },
    );
    finalizeContext(bytes);
    return response;
  }

  if (!storage?.session || storage.session.phase !== "playing") {
    const { response, bytes } = jsonAnswerResponse(
      { error: "Game is not in progress." },
      { status: 409 },
    );
    finalizeContext(bytes);
    return response;
  }

  if (challenge.status !== "awarded") {
    const nodeDef = ENGLISH_CRAFT_RESOURCE_NODE_BY_ID[challenge.nodeId];
    const position = storage.playerPositions?.[playerId];
    const near = Boolean(
      nodeDef && position && findNearestInteractable(position.x, position.y, [nodeDef]),
    );
    await timer.measure("gameplay_validate", () => near);
    if (!near) {
      const { response, bytes } = jsonAnswerResponse(
        { error: "Move closer to this resource." },
        { status: 409 },
      );
      finalizeContext(bytes);
      return response;
    }
  }

  if (challenge.status === "awarded") {
    idempotencyOutcome = "already_awarded";
    duplicateSubmission = true;
    responseStrategy = "receipt_replay";
    const receipt = normalizeAwardReceipt(storage.awardReceipts?.[challengeId]);
    resultReadyMs = Math.round(performance.now() - requestStartedAt);
    const { response, bytes } = jsonAnswerResponse(
      harvestCorrectPayload({
        carryGranted:
          receipt?.awardKind === "carry" ?
            { type: receipt.resourceType, sourceNodeId: challenge.nodeId }
          : null,
        nodeCooldownEndsAt: receipt?.nodeCooldownEndsAt,
        alreadyAwarded: true,
        poolTotal: readResourcePool(storage),
      }),
    );
    finalizeContext(bytes);
    return response;
  }

  const ctx = readChallengeQuestionSetContext(storage.session, challenge);
  if (skip) {
    counters.supabaseQueryCount += 1;
    const skipped = await timer.measure("challenge_consume", () => markChallengeSkipped(challengeId));
    if (!skipped) {
      const { response, bytes } = jsonAnswerResponse(
        { error: "Challenge can no longer be skipped." },
        { status: 409 },
      );
      finalizeContext(bytes);
      return response;
    }
    counters.rpcCount += 1;
    await timer.measure("reporting_write", () => recordCurrentLiveGameSkip(challengeId));
    reportingCommittedMs = Math.round(performance.now() - requestStartedAt);
    resultReadyMs = reportingCommittedMs;
    responseStrategy = "skip";
    const { response, bytes } = jsonAnswerResponse(harvestIncorrectPayload(true));
    finalizeContext(bytes);
    return response;
  }

  const correct = await timer.measure("answer_validate", async () => {
    if (challenge.validationPayload?.type === "multiple_choice") {
      correctnessSource = "validation_payload";
      return validateHarvestAnswer(challenge.validationPayload, answer);
    }
    correctnessSource = "question_snapshot";
    counters.supabaseQueryCount += 1;
    return isHarvestAnswerCorrect(ctx.ref, challenge.questionId, answer, ctx.version);
  });

  if (!correct) {
    counters.rpcCount += 1;
    await timer.measure("attempt_insert", () =>
      recordCurrentLiveGameAttempt({
        challengeId,
        submissionId: submission.id,
        selectedAnswer: answer,
        correct: false,
        responseTimeMs: submission.responseTimeMs,
      }),
    );
    reportingCommittedMs = Math.round(performance.now() - requestStartedAt);
    resultReadyMs = reportingCommittedMs;
    responseStrategy = "incorrect_minimal";
    const { response, bytes } = jsonAnswerResponse(harvestIncorrectPayload());
    finalizeContext(bytes);
    return response;
  }

  counters.supabaseQueryCount += 1;
  const claim = await timer.measure("challenge_consume", () =>
    claimLiveGameChallengeAward(challengeId),
  );
  if (claim.kind === "missing") {
    const { response, bytes } = jsonAnswerResponse(
      { error: "Challenge expired or not found." },
      { status: 404 },
    );
    finalizeContext(bytes);
    return response;
  }

  const receiptFromStorage = normalizeAwardReceipt(storage.awardReceipts?.[challengeId]);

  if (claim.kind === "processing") {
    if (receiptFromStorage?.awardKind === "carry") {
      idempotencyOutcome = "inflight_receipt";
      duplicateSubmission = true;
      responseStrategy = "receipt_replay";
      resultReadyMs = Math.round(performance.now() - requestStartedAt);
      const { response, bytes } = jsonAnswerResponse(
        harvestCorrectPayload({
          carryGranted: {
            type: receiptFromStorage.resourceType,
            sourceNodeId: challenge.nodeId,
          },
          nodeCooldownEndsAt: receiptFromStorage.nodeCooldownEndsAt,
          alreadyAwarded: true,
          poolTotal: readResourcePool(storage),
        }),
      );
      finalizeContext(bytes);
      return response;
    }
    const { response, bytes } = jsonAnswerResponse(
      { error: "Answer is already being processed. Please retry." },
      { status: 409 },
    );
    finalizeContext(bytes);
    return response;
  }

  if (claim.kind === "awarded") {
    idempotencyOutcome = "claim_awarded";
    duplicateSubmission = true;
    let latest = storage;
    let receipt = receiptFromStorage;
    if (receipt?.awardKind !== "carry") {
      counters.liveblocksReadCount += 1;
      latest =
        (await timer.measure("liveblocks_read", () => readLiveGameStorageJson(roomId))) ?? storage;
      receipt = normalizeAwardReceipt(latest?.awardReceipts?.[challengeId]);
    }
    responseStrategy = "receipt_replay";
    resultReadyMs = Math.round(performance.now() - requestStartedAt);
    const { response, bytes } = jsonAnswerResponse(
      harvestCorrectPayload({
        carryGranted:
          receipt?.awardKind === "carry" ?
            { type: receipt.resourceType, sourceNodeId: challenge.nodeId }
          : null,
        nodeCooldownEndsAt: receipt?.nodeCooldownEndsAt,
        alreadyAwarded: true,
        poolTotal: readResourcePool(latest),
      }),
    );
    finalizeContext(bytes);
    return response;
  }

  counters.liveblocksMutateCount += 1;
  const award = await timer.measure("reward_mutate", () =>
    awardCarryForNode({
      roomId,
      playerId,
      nodeId: challenge.nodeId,
      challengeId,
      questionId: challenge.questionId,
    }),
  );
  if (!award) {
    counters.supabaseQueryCount += 1;
    await timer.measure("challenge_consume", () =>
      releaseLiveGameChallengeAwardClaim(challengeId),
    );
    idempotencyOutcome = "mutate_failed_released";
    const { response, bytes } = jsonAnswerResponse(
      { error: "Could not award carry for this resource. Please retry." },
      { status: 503 },
    );
    finalizeContext(bytes);
    return response;
  }

  gameplayCommittedMs = Math.round(performance.now() - requestStartedAt);
  idempotencyOutcome = award.alreadyAwarded ? "mutate_receipt" : "mutate_applied";
  duplicateSubmission = award.alreadyAwarded;

  counters.rpcCount += 1;
  await timer.measure("reporting_write", () =>
    finalizeCurrentLiveGameCorrectAnswer({
      challengeId,
      submissionId: submission.id,
      selectedAnswer: answer,
      responseTimeMs: submission.responseTimeMs,
      contribution: {
        harvested: { [award.resourceType]: award.alreadyAwarded ? 0 : 1 },
      },
    }),
  );
  reportingCommittedMs = Math.round(performance.now() - requestStartedAt);
  resultReadyMs = reportingCommittedMs;
  responseStrategy = "correct_minimal";

  const { response, bytes } = jsonAnswerResponse(
    harvestCorrectPayload({
      carryGranted: { type: award.resourceType, sourceNodeId: award.sourceNodeId },
      nodeCooldownEndsAt: award.nodeCooldownEndsAt,
      alreadyAwarded: award.alreadyAwarded,
      poolTotal: readResourcePool(storage),
    }),
  );
  finalizeContext(bytes);
  return response;
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_answer", async (timer) => {
    try {
      return await handlePost(request, timer);
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      }
      console.error("Live-game answer request failed", error);
      return NextResponse.json(
        { error: "The answer service is temporarily unavailable. Your answer can be retried." },
        { status: 503 },
      );
    }
  });
}
