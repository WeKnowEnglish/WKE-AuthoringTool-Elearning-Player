import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { isCraftRecipeId } from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { isCraftOrderCorrect } from "@/lib/live-game/server/question-set-resolver";
import { readChallengeQuestionSetContext } from "@/lib/live-game/server/question-set-challenge-context";
import { awardCraftRecipe } from "@/lib/live-game/server/award-craft-recipe";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  markChallengeAwarded,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readResourcePool } from "@/lib/live-game/resource-pool";

type CraftAnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  order?: string[];
  recipeId?: string;
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
) {
  return {
    correct,
    poolTotal: readResourcePool(storage),
    craftedItems: readCraftedItems(storage),
    alreadyAwarded,
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
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;
  const order = (parsed.order ?? []).map((word) => word.trim());

  const challenge = await getLiveGameChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (challenge.roomId !== roomId || challenge.playerId !== playerId) {
    return NextResponse.json({ error: "Challenge mismatch." }, { status: 403 });
  }
  if (challenge.nodeId !== ENGLISH_CRAFT_CRAFT_BENCH_ID) {
    return NextResponse.json({ error: "Invalid craft challenge." }, { status: 400 });
  }
  if (challenge.status === "awarded") {
    const storage = await readLiveGameStorageJson(roomId);
    return NextResponse.json(craftAnswerPayload(storage, true, true));
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session || storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  const ctx = readChallengeQuestionSetContext(storage.session, challenge);
  const correct =
    skip ||
    (await isCraftOrderCorrect(ctx.ref, challenge.questionId, order, ctx.version));
  if (!correct) {
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

  await markChallengeAwarded(challengeId);

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
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game craft answer request failed", error);
    return NextResponse.json(
      { error: "The craft answer service is temporarily unavailable. Your answer can be retried." },
      { status: 503 },
    );
  }
}
