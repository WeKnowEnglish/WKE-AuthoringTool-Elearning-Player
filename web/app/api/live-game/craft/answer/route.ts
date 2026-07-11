import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { isCraftAnswerCorrect } from "@/lib/live-game/modes/english-craft/questions-v1";
import { awardCraftBridge } from "@/lib/live-game/server/award-craft-bridge";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  markChallengeAwarded,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";

type CraftAnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  playerId?: string;
  order?: string[];
};

function parseCraftAnswerBody(body: unknown): CraftAnswerRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as CraftAnswerRequestBody;
  if (
    typeof record.roomId !== "string" ||
    typeof record.challengeId !== "string" ||
    typeof record.playerId !== "string" ||
    !Array.isArray(record.order)
  ) {
    return null;
  }
  if (!record.order.every((word) => typeof word === "string")) {
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

  const parsed = parseCraftAnswerBody(body);
  if (!parsed?.roomId || !parsed.challengeId || !parsed.playerId || !parsed.order) {
    return NextResponse.json(
      { error: "roomId, challengeId, playerId, and order are required." },
      { status: 400 },
    );
  }

  const roomId = parsed.roomId.trim();
  const challengeId = parsed.challengeId.trim();
  const playerId = parsed.playerId.trim();
  const order = parsed.order.map((word) => word.trim());

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
    return NextResponse.json({
      correct: true,
      poolTotal: { wood: storage?.resourcePool?.wood ?? 0 },
      bridgeCrafted: storage?.craftedItems?.bridge === true,
      riverCrossingUnlocked: storage?.unlockedObjects?.river_crossing === true,
      alreadyCrafted: true,
    });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session || storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  const correct = isCraftAnswerCorrect(challenge.questionId, order);
  if (!correct) {
    return NextResponse.json({
      correct: false,
      poolTotal: { wood: storage.resourcePool?.wood ?? 0 },
      bridgeCrafted: storage.craftedItems?.bridge === true,
    });
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
    return NextResponse.json({
      correct: true,
      poolTotal: { wood: latest?.resourcePool?.wood ?? 0 },
      bridgeCrafted: latest?.craftedItems?.bridge === true,
      riverCrossingUnlocked: latest?.unlockedObjects?.river_crossing === true,
      alreadyCrafted: true,
    });
  }

  const award = await awardCraftBridge({ roomId, challengeId });
  if (!award) {
    return NextResponse.json({ error: "Could not craft the bridge right now." }, { status: 409 });
  }

  await markChallengeAwarded(challengeId);

  return NextResponse.json({
    correct: true,
    poolTotal: { wood: award.wood },
    bridgeCrafted: award.bridgeCrafted,
    riverCrossingUnlocked: award.riverCrossingUnlocked,
    alreadyCrafted: award.alreadyCrafted,
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("Live-game craft answer request failed", error);
    return NextResponse.json(
      { error: "The craft answer service is temporarily unavailable. Your answer can be retried." },
      { status: 503 },
    );
  }
}
