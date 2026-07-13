import { NextResponse } from "next/server";
import { buildSafeLiveGameQuestionBundle } from "@/lib/live-game/server/question-bundle";
import { getQuestionSetSnapshot } from "@/lib/live-game/server/question-set-resolver";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";

function parseRoomId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const roomId = (body as { roomId?: unknown }).roomId;
  return typeof roomId === "string" && roomId.startsWith("wke-live-game-") ? roomId.trim() : null;
}

export async function POST(request: Request) {
  const roomId = parseRoomId(await request.json().catch(() => null));
  if (!roomId) return NextResponse.json({ error: "Valid roomId required." }, { status: 400 });

  try {
    await requireLiveGamePlayerSession(roomId);
    const storage = await readLiveGameStorageJson(roomId);
    if (!storage?.session) return NextResponse.json({ error: "Room not found." }, { status: 404 });

    const binding = readSessionQuestionSetBinding(storage.session);
    const snapshot = await getQuestionSetSnapshot(binding.ref, binding.version);
    const bundle = buildSafeLiveGameQuestionBundle({
      roomId,
      questionSetId: binding.setId,
      questionSetVersion: binding.version,
      snapshot,
    });

    return NextResponse.json(bundle, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live-game question bundle preload failed", error);
    return NextResponse.json({ error: "Could not preload questions." }, { status: 503 });
  }
}
