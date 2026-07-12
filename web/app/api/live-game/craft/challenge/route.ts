import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  ENGLISH_CRAFT_CRAFT_BENCH_ID,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { toClientCraftQuestion } from "@/lib/live-game/modes/english-craft/questions-v1";
import { getCraftQuestionFromSet, resolveLiveGameQuestionSetId } from "@/lib/live-game/modes/english-craft/question-sets";
import {
  createLiveGameChallenge,
  findActiveChallengeForPlayerNode,
} from "@/lib/live-game/server/challenge-store";
import {
  canStartCraftChallenge,
  isBridgeCrafted,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_CRAFT_BENCH_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";

type CraftChallengeRequestBody = {
  roomId?: string;
};

function parseCraftChallengeBody(body: unknown): CraftChallengeRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as CraftChallengeRequestBody;
  if (typeof record.roomId !== "string") {
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

  const parsed = parseCraftChallengeBody(body);
  if (!parsed?.roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;
  const nodeId = ENGLISH_CRAFT_CRAFT_BENCH_ID;

  if (!roomId.startsWith("wke-live-game-")) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  const questionSetId = resolveLiveGameQuestionSetId(storage.session.questionSetId);
  const craftQuestion = getCraftQuestionFromSet(questionSetId);
  if (storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }
  if (isBridgeCrafted(storage)) {
    return NextResponse.json({ error: "The bridge is already crafted." }, { status: 409 });
  }
  if (!canStartCraftChallenge(storage)) {
    return NextResponse.json({ error: "Team needs 10 wood to craft the bridge." }, { status: 409 });
  }
  const position = storage.playerPositions?.[playerId];
  if (
    !position ||
    Date.now() - position.updatedAt > 5_000 ||
    !findNearestInteractable(position.x, position.y, [ENGLISH_CRAFT_CRAFT_BENCH_V1])
  ) {
    return NextResponse.json({ error: "Move closer to the workbench." }, { status: 409 });
  }

  const existing = await findActiveChallengeForPlayerNode({ roomId, playerId, nodeId });
  if (existing) {
    return NextResponse.json({
      challengeId: existing.challengeId,
      expiresAt: new Date(existing.expiresAt).toISOString(),
      question: toClientCraftQuestion(craftQuestion),
    });
  }

  const challenge = await createLiveGameChallenge({
    roomId,
    playerId,
    nodeId,
    questionId: craftQuestion.id,
  });

  return NextResponse.json({
    challengeId: challenge.challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    question: toClientCraftQuestion(craftQuestion),
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game craft challenge request failed", error);
    return NextResponse.json(
      { error: "The craft challenge service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
