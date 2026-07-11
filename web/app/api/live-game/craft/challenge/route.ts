import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  ENGLISH_CRAFT_CRAFT_BENCH_ID,
  ENGLISH_CRAFT_CRAFT_QUESTION_ID,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  ENGLISH_CRAFT_CRAFT_BRIDGE_V1,
  toClientCraftQuestion,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import {
  createLiveGameChallenge,
  findActiveChallengeForPlayerNode,
} from "@/lib/live-game/server/challenge-store";
import {
  canStartCraftChallenge,
  isBridgeCrafted,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";

type CraftChallengeRequestBody = {
  roomId?: string;
  playerId?: string;
};

function parseCraftChallengeBody(body: unknown): CraftChallengeRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as CraftChallengeRequestBody;
  if (typeof record.roomId !== "string" || typeof record.playerId !== "string") {
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
  if (!parsed?.roomId || !parsed.playerId) {
    return NextResponse.json({ error: "roomId and playerId are required." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  const playerId = parsed.playerId.trim();
  const nodeId = ENGLISH_CRAFT_CRAFT_BENCH_ID;

  if (!roomId.startsWith("wke-live-game-")) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  if (storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }
  if (isBridgeCrafted(storage)) {
    return NextResponse.json({ error: "The bridge is already crafted." }, { status: 409 });
  }
  if (!canStartCraftChallenge(storage)) {
    return NextResponse.json({ error: "Team needs 10 wood to craft the bridge." }, { status: 409 });
  }

  const existing = await findActiveChallengeForPlayerNode({ roomId, playerId, nodeId });
  if (existing) {
    return NextResponse.json({
      challengeId: existing.challengeId,
      expiresAt: new Date(existing.expiresAt).toISOString(),
      question: toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1),
    });
  }

  const challenge = await createLiveGameChallenge({
    roomId,
    playerId,
    nodeId,
    questionId: ENGLISH_CRAFT_CRAFT_QUESTION_ID,
  });

  return NextResponse.json({
    challengeId: challenge.challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    question: toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1),
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("Live-game craft challenge request failed", error);
    return NextResponse.json(
      { error: "The craft challenge service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
