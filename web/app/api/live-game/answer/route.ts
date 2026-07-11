import { NextResponse } from "next/server";
import { isMcAnswerCorrect } from "@/lib/live-game/modes/english-craft/questions-v1";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { awardWoodForNode } from "@/lib/live-game/server/award-wood";
import {
  getLiveGameChallenge,
  markChallengeAwarded,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";

type AnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  answer?: string;
  playerId?: string;
  responseTimeMs?: number;
};

function parseAnswerBody(body: unknown): AnswerRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as AnswerRequestBody;
  if (
    typeof record.roomId !== "string" ||
    typeof record.challengeId !== "string" ||
    typeof record.answer !== "string" ||
    typeof record.playerId !== "string"
  ) {
    return null;
  }
  return record;
}

export async function POST(request: Request) {
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
  if (!parsed?.roomId || !parsed.challengeId || !parsed.answer || !parsed.playerId) {
    return NextResponse.json(
      { error: "roomId, challengeId, answer, and playerId are required." },
      { status: 400 },
    );
  }

  const roomId = parsed.roomId.trim();
  const challengeId = parsed.challengeId.trim();
  const answer = parsed.answer.trim();
  const playerId = parsed.playerId.trim();

  const challenge = getLiveGameChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (challenge.roomId !== roomId || challenge.playerId !== playerId) {
    return NextResponse.json({ error: "Challenge mismatch." }, { status: 403 });
  }
  if (challenge.awarded) {
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

  const correct = isMcAnswerCorrect(challenge.questionId, answer);
  if (!correct) {
    return NextResponse.json({
      correct: false,
      resourceAwarded: null,
      poolTotal: { wood: storage.resourcePool?.wood ?? 0 },
    });
  }

  const award = await awardWoodForNode({ roomId, nodeId: challenge.nodeId });
  if (!award) {
    return NextResponse.json({ error: "Could not award wood for this tree." }, { status: 409 });
  }

  markChallengeAwarded(challengeId);

  return NextResponse.json({
    correct: true,
    resourceAwarded: { type: "wood", amount: 1 },
    poolTotal: { wood: award.wood },
    nodeCooldownEndsAt: award.nodeCooldownEndsAt,
  });
}
