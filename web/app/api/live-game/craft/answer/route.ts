import { NextResponse } from "next/server";
import {
  withLiveGameServerTiming,
  type LiveGameServerTimer,
} from "@/lib/live-game/server/server-timing";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { isCraftRecipeId } from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { isCraftOrderCorrect } from "@/lib/live-game/server/question-set-resolver";
import { isCraftOrderCorrect as validateCraftOrder } from "@/lib/live-game/question-banks/schemas";
import {
  challengeMatchesQuestionBank,
  readChallengeQuestionSetContext,
} from "@/lib/live-game/server/question-set-challenge-context";
import { awardCraftRecipe } from "@/lib/live-game/server/award-craft-recipe";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  releaseLiveGameChallengeAwardClaim,
  markChallengeSkipped,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_CRAFT_BENCH_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
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
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import type { AwardCraftRecipeResult } from "@/lib/live-game/server/award-craft-recipe";

type CraftAnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  order?: string[];
  recipeId?: string;
  submissionId?: string;
  responseTimeMs?: number;
  skip?: boolean;
};

function parseCraftAnswerBody(body: unknown): CraftAnswerRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as CraftAnswerRequestBody;
  if (typeof record.roomId !== "string" || typeof record.challengeId !== "string") {
    return null;
  }
  if (record.skip === true) {
    if (typeof record.recipeId !== "string") return null;
    return {
      roomId: record.roomId,
      challengeId: record.challengeId,
      recipeId: record.recipeId,
      order: Array.isArray(record.order) ? record.order.filter((word) => typeof word === "string") : [],
      submissionId: record.submissionId,
      responseTimeMs: record.responseTimeMs,
      skip: true,
    };
  }
  if (
    typeof record.recipeId !== "string" ||
    !Array.isArray(record.order) ||
    !record.order.every((word) => typeof word === "string")
  ) {
    return null;
  }
  return record;
}

function craftCorrectPayload(input: {
  poolTotal: ReturnType<typeof readResourcePool>;
  craftedItems: ReturnType<typeof readCraftedItems>;
  inventory?: AwardCraftRecipeResult["inventory"];
  recipeId?: string;
  alreadyAwarded?: boolean;
}) {
  return {
    correct: true as const,
    poolTotal: input.poolTotal,
    craftedItems: input.craftedItems,
    inventory: input.inventory,
    recipeId: input.recipeId,
    alreadyAwarded: input.alreadyAwarded,
  };
}

function craftIncorrectPayload(skipped = false) {
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
        routeType: "craft",
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

  const parsed = parseCraftAnswerBody(body);
  if (!parsed?.roomId || !parsed.challengeId || !parsed.recipeId) {
    return NextResponse.json(
      { error: "roomId, challengeId, and recipeId are required." },
      { status: 400 },
    );
  }

  if (!isCraftRecipeId(parsed.recipeId)) {
    return NextResponse.json({ error: "Unknown craft recipe." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  challengeId = parsed.challengeId.trim();
  const recipeId = parsed.recipeId;
  const skip = parsed.skip === true;
  const submission = normalizeLiveGameSubmission(parsed.submissionId, parsed.responseTimeMs);
  const order = (parsed.order ?? []).map((word) => word.trim());
  timer.setContext({
    roomId,
    routeType: "craft",
    challengeIdHash: answerTimingContext({
      routeType: "craft",
      challengeId,
      counters,
    }).challengeIdHash,
  });

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
  if (challenge.nodeId !== ENGLISH_CRAFT_CRAFT_BENCH_ID) {
    const { response, bytes } = jsonAnswerResponse(
      { error: "Invalid craft challenge." },
      { status: 400 },
    );
    finalizeContext(bytes);
    return response;
  }
  if (!challengeMatchesQuestionBank(challenge, "craft")) {
    const { response, bytes } = jsonAnswerResponse(
      { error: "Invalid craft challenge." },
      { status: 403 },
    );
    finalizeContext(bytes);
    return response;
  }

  if (challenge.status === "awarded") {
    idempotencyOutcome = "already_awarded";
    duplicateSubmission = true;
    responseStrategy = "receipt_replay";
    resultReadyMs = Math.round(performance.now() - requestStartedAt);
    const { response, bytes } = jsonAnswerResponse(
      craftCorrectPayload({
        poolTotal: readResourcePool(storage),
        craftedItems: readCraftedItems(storage),
        alreadyAwarded: true,
      }),
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

  const position = storage.playerPositions?.[playerId];
  const near = Boolean(
    position && findNearestInteractable(position.x, position.y, [ENGLISH_CRAFT_CRAFT_BENCH_V1]),
  );
  await timer.measure("gameplay_validate", () => near);
  if (!near) {
    const { response, bytes } = jsonAnswerResponse(
      { error: "Move closer to the workbench." },
      { status: 409 },
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
    const { response, bytes } = jsonAnswerResponse(craftIncorrectPayload(true));
    finalizeContext(bytes);
    return response;
  }

  const correct = await timer.measure("answer_validate", async () => {
    if (challenge.validationPayload?.type === "drag_sentence") {
      correctnessSource = "validation_payload";
      return validateCraftOrder(challenge.validationPayload, order);
    }
    correctnessSource = "question_snapshot";
    counters.supabaseQueryCount += 1;
    return isCraftOrderCorrect(ctx.ref, challenge.questionId, order, ctx.version);
  });

  if (!correct) {
    counters.rpcCount += 1;
    await timer.measure("attempt_insert", () =>
      recordCurrentLiveGameAttempt({
        challengeId,
        submissionId: submission.id,
        selectedAnswer: order,
        correct: false,
        responseTimeMs: submission.responseTimeMs,
      }),
    );
    reportingCommittedMs = Math.round(performance.now() - requestStartedAt);
    resultReadyMs = reportingCommittedMs;
    responseStrategy = "incorrect_minimal";
    const { response, bytes } = jsonAnswerResponse(craftIncorrectPayload());
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

  if (claim.kind === "processing" || claim.kind === "awarded") {
    const hasCraftReceipt = Boolean(storage.craftReceipts?.[challengeId]);
    if (claim.kind === "processing" && !hasCraftReceipt) {
      const { response, bytes } = jsonAnswerResponse(
        { error: "Answer is already being processed. Please retry." },
        { status: 409 },
      );
      finalizeContext(bytes);
      return response;
    }
    let latest = storage;
    if (claim.kind === "awarded" && !hasCraftReceipt) {
      counters.liveblocksReadCount += 1;
      latest =
        (await timer.measure("liveblocks_read", () => readLiveGameStorageJson(roomId))) ?? storage;
    }
    idempotencyOutcome = claim.kind === "processing" ? "inflight_receipt" : "claim_awarded";
    duplicateSubmission = true;
    responseStrategy = "receipt_replay";
    resultReadyMs = Math.round(performance.now() - requestStartedAt);
    const { response, bytes } = jsonAnswerResponse(
      craftCorrectPayload({
        poolTotal: readResourcePool(latest),
        craftedItems: readCraftedItems(latest),
        alreadyAwarded: true,
      }),
    );
    finalizeContext(bytes);
    return response;
  }

  counters.liveblocksMutateCount += 1;
  const award = await timer.measure("reward_mutate", () =>
    awardCraftRecipe({ roomId, challengeId, recipeId, playerId }),
  );
  if (!award) {
    counters.supabaseQueryCount += 1;
    await timer.measure("challenge_consume", () =>
      releaseLiveGameChallengeAwardClaim(challengeId),
    );
    idempotencyOutcome = "mutate_failed_released";
    const { response, bytes } = jsonAnswerResponse(
      { error: "Could not complete craft right now. Please retry." },
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
      selectedAnswer: order,
      responseTimeMs: submission.responseTimeMs,
      contribution: {
        crafted: { [award.recipeId]: award.alreadyAwarded ? 0 : 1 },
      },
    }),
  );
  reportingCommittedMs = Math.round(performance.now() - requestStartedAt);
  resultReadyMs = reportingCommittedMs;
  responseStrategy = "correct_minimal";

  const { response, bytes } = jsonAnswerResponse(
    craftCorrectPayload({
      poolTotal: award.poolTotal,
      craftedItems: award.craftedItems,
      inventory: award.inventory,
      recipeId: award.recipeId,
      alreadyAwarded: award.alreadyAwarded,
    }),
  );
  finalizeContext(bytes);
  return response;
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_craft_answer", async (timer) => {
    try {
      return await handlePost(request, timer);
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      }
      console.error("Live-game craft answer request failed", error);
      return NextResponse.json(
        {
          error: "The craft answer service is temporarily unavailable. Your answer can be retried.",
        },
        { status: 503 },
      );
    }
  });
}
