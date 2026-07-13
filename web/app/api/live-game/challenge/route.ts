import { NextResponse } from "next/server";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";
import { ENGLISH_CRAFT_RESOURCE_NODE_BY_ID } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { toClientMcQuestionFromRow } from "@/lib/live-game/question-banks/client-payloads";
import {
  getQuestionById,
  pickHarvestQuestion,
} from "@/lib/live-game/server/question-set-resolver";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  createLiveGameChallenge,
} from "@/lib/live-game/server/challenge-store";
import { isPlayerCarrying } from "@/lib/live-game/server/player-carry";
import {
  isResourceNodeAvailable,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { expandInteractRadius, findNearestInteractable } from "@/lib/live-game/engine/interact";
import { LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX } from "@/lib/live-game/challenge-prefetch";

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
  const binding = readSessionQuestionSetBinding(storage.session);
  if (!isResourceNodeAvailable(nodeState)) {
    return NextResponse.json({ error: "This resource is on cooldown." }, { status: 409 });
  }
  const position = storage.playerPositions?.[playerId];
  if (
    !position ||
    Date.now() - position.updatedAt > 5_000 ||
    !findNearestInteractable(position.x, position.y, [
      expandInteractRadius(nodeDef, LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX),
    ])
  ) {
    return NextResponse.json({ error: "Move closer to this resource." }, { status: 409 });
  }

  const pickedQuestion = await pickHarvestQuestion(
    binding.ref,
    binding.version,
    `${playerId}:${nodeId}:${nodeState?.collectedCount ?? 0}`,
  );
  const challenge = await createLiveGameChallenge({
    roomId,
    playerId,
    nodeId,
    questionId: pickedQuestion.id,
    questionSetId: binding.setId,
    questionSetVersion: binding.version,
    questionBank: "harvest",
    validationPayload: pickedQuestion.payload,
  });
  const question =
    challenge.questionId === pickedQuestion.id ? pickedQuestion
    : (await getQuestionById(binding.ref, "harvest", challenge.questionId, binding.version)) ?? pickedQuestion;

  return NextResponse.json({
    challengeId: challenge.challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    question: toClientMcQuestionFromRow(question, challenge.challengeId),
  });
}

export async function POST(request: Request) {
  try {
    return await withLiveGameServerTiming("live_game_challenge", () => handlePost(request));
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game challenge request failed", error);
    return NextResponse.json(
      { error: "The challenge service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
