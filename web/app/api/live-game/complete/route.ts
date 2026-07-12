import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  areAllRegisteredPlayersOnBoat,
  isPlayerInBoatBoardingZone,
} from "@/lib/live-game/engine/boat-boarding";
import { ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { completeLiveGameObjective } from "@/lib/live-game/server/complete-objective";
import {
  canCompleteObjective,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";

type CompleteRequestBody = {
  roomId?: string;
  kind?: string;
};

function parseCompleteBody(body: unknown): CompleteRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as CompleteRequestBody;
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

  const parsed = parseCompleteBody(body);
  if (!parsed?.roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }

  const kind = parsed.kind === "boat_escape" || parsed.kind == null ? "boat_escape" : null;
  if (!kind) {
    return NextResponse.json({ error: "Unknown completion kind." }, { status: 400 });
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

  if (storage.session.phase === "completed") {
    return NextResponse.json({
      objectiveCompleted: storage.session.objectiveCompleted === true,
      victoryAt: storage.session.victoryAt,
      completedByPlayerId: storage.session.completedByPlayerId,
      alreadyCompleted: true,
      kind: "boat_escape",
    });
  }

  if (!canCompleteObjective(storage)) {
    return NextResponse.json({ error: "The boat is not ready for boarding yet." }, { status: 409 });
  }

  const now = Date.now();
  const position = storage.playerPositions?.[playerId];
  if (
    !position ||
    now - position.updatedAt > 5_000 ||
    !isPlayerInBoatBoardingZone(position.x, position.y, ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1)
  ) {
    return NextResponse.json({ error: "Move onto the boat with your team." }, { status: 409 });
  }

  if (
    !areAllRegisteredPlayersOnBoat(
      Object.keys(storage.players ?? {}),
      storage.playerPositions,
      ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1,
      now,
    )
  ) {
    return NextResponse.json({ error: "Everyone on the team must be on the boat." }, { status: 409 });
  }

  const result = await completeLiveGameObjective({ roomId, playerId, kind });
  if (!result) {
    return NextResponse.json({ error: "Could not complete the escape." }, { status: 409 });
  }

  return NextResponse.json({
    objectiveCompleted: result.objectiveCompleted,
    victoryAt: result.victoryAt,
    completedByPlayerId: result.completedByPlayerId,
    alreadyCompleted: result.alreadyCompleted,
    kind: result.kind,
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game complete request failed", error);
    return NextResponse.json(
      { error: "The completion service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
