import { NextResponse } from "next/server";
import { ENGLISH_CRAFT_WOOD_TREE_BY_ID } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  getMcQuestionById,
  pickMcQuestionForNode,
  toClientMcQuestion,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  createLiveGameChallenge,
  findActiveChallengeForPlayerNode,
} from "@/lib/live-game/server/challenge-store";
import { refreshExpiredNodeCooldowns } from "@/lib/live-game/server/award-wood";
import {
  isResourceNodeAvailable,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";

type ChallengeRequestBody = {
  roomId?: string;
  nodeId?: string;
  playerId?: string;
};

function parseChallengeBody(body: unknown): ChallengeRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as ChallengeRequestBody;
  if (
    typeof record.roomId !== "string" ||
    typeof record.nodeId !== "string" ||
    typeof record.playerId !== "string"
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
  if (!parsed?.roomId || !parsed.nodeId || !parsed.playerId) {
    return NextResponse.json({ error: "roomId, nodeId, and playerId are required." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  const nodeId = parsed.nodeId.trim();
  const playerId = parsed.playerId.trim();

  if (!roomId.startsWith("wke-live-game-")) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  if (!ENGLISH_CRAFT_WOOD_TREE_BY_ID[nodeId]) {
    return NextResponse.json({ error: "Unknown resource node." }, { status: 400 });
  }

  await refreshExpiredNodeCooldowns(roomId);

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  if (storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  const nodeState = storage.resourceNodes?.[nodeId];
  if (!isResourceNodeAvailable(nodeState)) {
    return NextResponse.json({ error: "This tree is on cooldown." }, { status: 409 });
  }

  const existing = await findActiveChallengeForPlayerNode({ roomId, playerId, nodeId });
  if (existing) {
    const question =
      getMcQuestionById(existing.questionId) ?? pickMcQuestionForNode(nodeId);
    return NextResponse.json({
      challengeId: existing.challengeId,
      expiresAt: new Date(existing.expiresAt).toISOString(),
      question: toClientMcQuestion(question),
    });
  }

  const question = pickMcQuestionForNode(nodeId);
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
    console.error("Live-game challenge request failed", error);
    return NextResponse.json(
      { error: "The challenge service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
