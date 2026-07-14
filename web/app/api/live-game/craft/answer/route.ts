import { NextResponse } from "next/server";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { isCraftRecipeId } from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { isCraftOrderCorrect } from "@/lib/live-game/server/question-set-resolver";
import { isCraftOrderCorrect as validateCraftOrder } from "@/lib/live-game/question-banks/schemas";
import { challengeMatchesQuestionBank, readChallengeQuestionSetContext } from "@/lib/live-game/server/question-set-challenge-context";
import { awardCraftRecipe } from "@/lib/live-game/server/award-craft-recipe";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  markChallengeAwarded,
  markChallengeSkipped,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_CRAFT_BENCH_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  normalizeLiveGameSubmission,
  recordCurrentLiveGameAttempt,
  recordCurrentLiveGameSkip,
} from "@/lib/live-game/server/report-evidence";

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

function craftAnswerPayload(
  storage: Awaited<ReturnType<typeof readLiveGameStorageJson>>,
  correct: boolean,
  alreadyAwarded = false,
  skipped = false,
) {
  return {
    correct,
    poolTotal: readResourcePool(storage),
    craftedItems: readCraftedItems(storage),
    alreadyAwarded,
    skipped,
  };
}

async function handlePost(request: Request) {
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
  const challengeId = parsed.challengeId.trim();
  const recipeId = parsed.recipeId;
  const skip = parsed.skip === true;
  const submission = normalizeLiveGameSubmission(parsed.submissionId, parsed.responseTimeMs);
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;
  const order = (parsed.order ?? []).map((word) => word.trim());

  const [challenge, storage] = await Promise.all([
    getLiveGameChallenge(challengeId),
    readLiveGameStorageJson(roomId),
  ]);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (challenge.roomId !== roomId || challenge.playerId !== playerId) {
    return NextResponse.json({ error: "Challenge mismatch." }, { status: 403 });
  }
  if (challenge.nodeId !== ENGLISH_CRAFT_CRAFT_BENCH_ID) {
    return NextResponse.json({ error: "Invalid craft challenge." }, { status: 400 });
  }
  if (!challengeMatchesQuestionBank(challenge, "craft")) {
    return NextResponse.json({ error: "Invalid craft challenge." }, { status: 403 });
  }
  if (challenge.status === "awarded") {
    return NextResponse.json(craftAnswerPayload(storage, true, true));
  }

  if (!storage?.session || storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  const position = storage.playerPositions?.[playerId];
  if (
    !position ||
    !findNearestInteractable(position.x, position.y, [ENGLISH_CRAFT_CRAFT_BENCH_V1])
  ) {
    return NextResponse.json({ error: "Move closer to the workbench." }, { status: 409 });
  }

  const ctx = readChallengeQuestionSetContext(storage.session, challenge);
  if (skip) {
    const skipped = await markChallengeSkipped(challengeId);
    if (!skipped) return NextResponse.json({ error: "Challenge can no longer be skipped." }, { status: 409 });
    await recordCurrentLiveGameSkip(challengeId);
    return NextResponse.json(craftAnswerPayload(storage, false, false, true));
  }
  const correct =
    challenge.validationPayload?.type === "drag_sentence" ?
      validateCraftOrder(challenge.validationPayload, order)
    : await isCraftOrderCorrect(ctx.ref, challenge.questionId, order, ctx.version);
  if (!correct) {
    await recordCurrentLiveGameAttempt({
      challengeId,
      submissionId: submission.id,
      selectedAnswer: order,
      correct: false,
      responseTimeMs: submission.responseTimeMs,
    });
    return NextResponse.json(craftAnswerPayload(storage, false));
  }

  const claim = await claimLiveGameChallengeAward(challengeId);
  if (claim.kind === "missing") {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (claim.kind === "processing") {
    return NextResponse.json(
      { error: "Answer is already being processed. Please retry." },
      { status: 409 },
    );
  }
  if (claim.kind === "awarded") {
    const latest = await readLiveGameStorageJson(roomId);
    return NextResponse.json(craftAnswerPayload(latest, true, true));
  }

  const award = await awardCraftRecipe({ roomId, challengeId, recipeId, playerId });
  if (!award) {
    return NextResponse.json({ error: "Could not complete craft right now." }, { status: 409 });
  }

  await Promise.all([
    markChallengeAwarded(challengeId),
    recordCurrentLiveGameAttempt({
      challengeId,
      submissionId: submission.id,
      selectedAnswer: order,
      correct: true,
      responseTimeMs: submission.responseTimeMs,
      contribution: {
        crafted: { [award.recipeId]: award.alreadyAwarded ? 0 : 1 },
      },
    }),
  ]);

  return NextResponse.json({
    correct: true,
    poolTotal: award.poolTotal,
    craftedItems: award.craftedItems,
    inventory: award.inventory,
    recipeId: award.recipeId,
    alreadyAwarded: award.alreadyAwarded,
  });
}

export async function POST(request: Request) {
  try {
    return await withLiveGameServerTiming("live_game_craft_answer", () => handlePost(request));
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game craft answer request failed", error);
    return NextResponse.json(
      { error: "The craft answer service is temporarily unavailable. Your answer can be retried." },
      { status: 503 },
    );
  }
}
