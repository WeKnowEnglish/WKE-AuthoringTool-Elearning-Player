import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { awardConsumeBread } from "@/lib/live-game/server/award-consume";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { readPlayerInventory } from "@/lib/live-game/server/read-player-inventory";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";

type ConsumeRequestBody = {
  roomId?: string;
  item?: string;
};

function parseConsumeBody(body: unknown): ConsumeRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as ConsumeRequestBody;
  if (typeof record.roomId !== "string" || typeof record.item !== "string") {
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

  const parsed = parseConsumeBody(body);
  if (!parsed?.roomId || parsed.item !== "bread") {
    return NextResponse.json({ error: "roomId and item=bread are required." }, { status: 400 });
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

  const inventory = readPlayerInventory(storage, playerId);
  if (inventory.bread < 1) {
    return NextResponse.json({ error: "No bread to eat." }, { status: 409 });
  }

  const award = await awardConsumeBread({ roomId, playerId });
  if (!award) {
    return NextResponse.json({ error: "Could not eat bread right now." }, { status: 409 });
  }

  return NextResponse.json({
    item: "bread",
    bread: award.bread,
    hunger: award.hunger,
    inventory: { bread: award.bread },
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live-game consume request failed", error);
    return NextResponse.json(
      { error: "The consume service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
