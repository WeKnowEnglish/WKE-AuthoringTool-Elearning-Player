import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { completeLiveGameObjective } from "@/lib/live-game/server/complete-objective";
import {
  canCompleteObjective,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";

type CompleteRequestBody = {
  roomId?: string;
  playerId?: string;
};

function parseCompleteBody(body: unknown): CompleteRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as CompleteRequestBody;
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

  const parsed = parseCompleteBody(body);
  if (!parsed?.roomId || !parsed.playerId) {
    return NextResponse.json({ error: "roomId and playerId are required." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  const playerId = parsed.playerId.trim();

  if (!roomId.startsWith("wke-live-game-")) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (storage.session.phase === "completed") {
    return NextResponse.json({
      objectiveCompleted: storage.session.objectiveCompleted === true,
      victoryAt: storage.session.victoryAt,
      completedByPlayerId: storage.session.completedByPlayerId,
      alreadyCompleted: true,
    });
  }

  if (!canCompleteObjective(storage)) {
    return NextResponse.json({ error: "Objective is not available yet." }, { status: 409 });
  }

  const result = await completeLiveGameObjective({ roomId, playerId });
  if (!result) {
    return NextResponse.json({ error: "Could not complete the objective." }, { status: 409 });
  }

  return NextResponse.json({
    objectiveCompleted: result.objectiveCompleted,
    victoryAt: result.victoryAt,
    completedByPlayerId: result.completedByPlayerId,
    alreadyCompleted: result.alreadyCompleted,
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("Live-game complete request failed", error);
    return NextResponse.json(
      { error: "The completion service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
