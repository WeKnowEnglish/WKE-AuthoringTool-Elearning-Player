import { NextResponse } from "next/server";
import { isQuestionSetAnswerCorrect, resolveLiveGameQuestionSetId } from "@/lib/live-game/modes/english-craft/question-sets";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { awardWoodForNode } from "@/lib/live-game/server/award-wood";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  markChallengeAwarded,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";

type AnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  answer?: string;
  responseTimeMs?: number;
};

function parseAnswerBody(body: unknown): AnswerRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as AnswerRequestBody;
  if (
    typeof record.roomId !== "string" ||
    typeof record.challengeId !== "string" ||
    typeof record.answer !== "string"
  ) {
    return null;
  }
  return record;
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

  const parsed = parseAnswerBody(body);
  if (!parsed?.roomId || !parsed.challengeId || !parsed.answer) {
    return NextResponse.json(
      { error: "roomId, challengeId, and answer are required." },
      { status: 400 },
    );
  }

  const roomId = parsed.roomId.trim();
  const challengeId = parsed.challengeId.trim();
  const answer = parsed.answer.trim();
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;

  const challenge = await getLiveGameChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (challenge.roomId !== roomId || challenge.playerId !== playerId) {
    return NextResponse.json({ error: "Challenge mismatch." }, { status: 403 });
  }
  if (challenge.status === "awarded") {
    const storage = await readLiveGameStorageJson(roomId);
    const wood = storage?.resourcePool?.wood ?? 0;
    return NextResponse.json({
      correct: true,
      resourceAwarded: { type: "wood", amount: 1 },
      poolTotal: { wood },
      alreadyAwarded: true,
    });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session || storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  const correct = isQuestionSetAnswerCorrect(
    resolveLiveGameQuestionSetId(storage.session.questionSetId),
    challenge.questionId,
    answer,
  );
  if (!correct) {
    return NextResponse.json({
      correct: false,
      resourceAwarded: null,
      poolTotal: { wood: storage.resourcePool?.wood ?? 0 },
    });
  }

  const claim = await claimLiveGameChallengeAward(challengeId);
  if (claim.kind === "missing") {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (claim.kind === "processing") {
    return NextResponse.json({ error: "Answer is already being processed. Please retry." }, { status: 409 });
  }
  if (claim.kind === "awarded") {
    const latest = await readLiveGameStorageJson(roomId);
    return NextResponse.json({
      correct: true,
      resourceAwarded: { type: "wood", amount: 1 },
      poolTotal: { wood: latest?.resourcePool?.wood ?? 0 },
      alreadyAwarded: true,
    });
  }

  const award = await awardWoodForNode({
    roomId,
    nodeId: challenge.nodeId,
    challengeId,
  });
  if (!award) {
    return NextResponse.json({ error: "Could not award wood for this tree." }, { status: 409 });
  }

  await markChallengeAwarded(challengeId);

  return NextResponse.json({
    correct: true,
    resourceAwarded: { type: "wood", amount: 1 },
    poolTotal: { wood: award.wood },
    nodeCooldownEndsAt: award.nodeCooldownEndsAt,
    alreadyAwarded: award.alreadyAwarded,
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game answer request failed", error);
    return NextResponse.json(
      { error: "The answer service is temporarily unavailable. Your answer can be retried." },
      { status: 503 },
    );
  }
}
