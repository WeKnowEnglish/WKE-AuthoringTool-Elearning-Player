import { NextResponse } from "next/server";
import { ENGLISH_CRAFT_RESOURCE_NODE_BY_ID } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { toClientMcQuestion } from "@/lib/live-game/modes/english-craft/questions-v1";
import { getQuestionFromSet, pickQuestionFromSet, resolveLiveGameQuestionSetId } from "@/lib/live-game/modes/english-craft/question-sets";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  createLiveGameChallenge,
  findActiveChallengeForPlayerNode,
} from "@/lib/live-game/server/challenge-store";
import { isPlayerCarrying } from "@/lib/live-game/server/player-carry";
import {
  isResourceNodeAvailable,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";

type ChallengeRequestBody = {
  roomId?: string;
  nodeId?: string;
};

function parseChallengeBody(body: unknown): ChallengeRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as ChallengeRequestBody;
  if (
    typeof record.roomId !== "string" ||
    typeof record.nodeId !== "string"
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

  const parsed = parseChallengeBody(body);
  if (!parsed?.roomId || !parsed.nodeId) {
    return NextResponse.json({ error: "roomId and nodeId are required." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  const nodeId = parsed.nodeId.trim();
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;

  if (!roomId.startsWith("wke-live-game-")) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  const nodeDef = ENGLISH_CRAFT_RESOURCE_NODE_BY_ID[nodeId];
  if (!nodeDef) {
    return NextResponse.json({ error: "Unknown resource node." }, { status: 400 });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  if (storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }
  if (isPlayerCarrying(storage, playerId)) {
    return NextResponse.json(
      { error: "You are already carrying something. Deposit it first." },
      { status: 409 },
    );
  }

  const nodeState = storage.resourceNodes?.[nodeId];
  const questionSetId = resolveLiveGameQuestionSetId(storage.session.questionSetId);
  if (!isResourceNodeAvailable(nodeState)) {
    return NextResponse.json({ error: "This resource is on cooldown." }, { status: 409 });
  }
  const position = storage.playerPositions?.[playerId];
  if (
    !position ||
    Date.now() - position.updatedAt > 5_000 ||
    !findNearestInteractable(position.x, position.y, [nodeDef])
  ) {
    return NextResponse.json({ error: "Move closer to this resource." }, { status: 409 });
  }

  const existing = await findActiveChallengeForPlayerNode({ roomId, playerId, nodeId });
  if (existing) {
    const question =
      getQuestionFromSet(questionSetId, existing.questionId) ??
      pickQuestionFromSet(questionSetId, `${playerId}:${nodeId}:${nodeState?.collectedCount ?? 0}`);
    return NextResponse.json({
      challengeId: existing.challengeId,
      expiresAt: new Date(existing.expiresAt).toISOString(),
      question: toClientMcQuestion(question),
    });
  }

  const question = pickQuestionFromSet(
    questionSetId,
    `${playerId}:${nodeId}:${nodeState?.collectedCount ?? 0}`,
  );
  const challenge = await createLiveGameChallenge({
    roomId,
    playerId,
    nodeId,
    questionId: question.id,
  });

  return NextResponse.json({
    challengeId: challenge.challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    question: toClientMcQuestion(question),
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game challenge request failed", error);
    return NextResponse.json(
      { error: "The challenge service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
