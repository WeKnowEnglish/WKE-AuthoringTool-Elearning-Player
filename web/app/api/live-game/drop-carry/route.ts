import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { clearPlayerCarry, readPlayerCarry } from "@/lib/live-game/server/player-carry";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";

type DropCarryRequestBody = {
  roomId?: string;
};

function parseDropCarryBody(body: unknown): DropCarryRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as DropCarryRequestBody;
  if (typeof record.roomId !== "string") return null;
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

  const parsed = parseDropCarryBody(body);
  if (!parsed?.roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;

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

  const carry = readPlayerCarry(storage, playerId);
  if (!carry) {
    return NextResponse.json({ error: "Nothing to drop." }, { status: 409 });
  }

  await clearPlayerCarry(roomId, playerId);

  return NextResponse.json({ dropped: true, resourceType: carry.resourceType });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live-game drop-carry request failed", error);
    return NextResponse.json(
      { error: "The drop-carry service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
