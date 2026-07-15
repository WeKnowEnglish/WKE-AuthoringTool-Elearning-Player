import { NextResponse } from "next/server";
import { getOrBuildSafeLiveGameQuestionBundle } from "@/lib/live-game/server/question-bundle";
import {
  getQuestionSetSnapshot,
  peekQuestionSetSnapshotCacheHit,
} from "@/lib/live-game/server/question-set-resolver";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

function parseRoomId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const roomId = (body as { roomId?: unknown }).roomId;
  return typeof roomId === "string" && roomId.startsWith("wke-live-game-") ? roomId.trim() : null;
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_question_bundle", async (timer) => {
    const roomId = parseRoomId(await request.json().catch(() => null));
    if (!roomId) return NextResponse.json({ error: "Valid roomId required." }, { status: 400 });
    timer.setContext({ roomId });

    try {
      await timer.measure("auth", () => requireLiveGamePlayerSession(roomId));
      const storage = await timer.measure("liveblocks_read", () => readLiveGameStorageJson(roomId));
      if (!storage?.session) return NextResponse.json({ error: "Room not found." }, { status: 404 });

      const binding = readSessionQuestionSetBinding(storage.session);
      const snapshotHit = peekQuestionSetSnapshotCacheHit(binding.ref, binding.version);
      let queryCount = 0;
      const snapshot = await timer.measure("supabase_query", async () => {
        if (!snapshotHit) queryCount += 1;
        return getQuestionSetSnapshot(binding.ref, binding.version);
      });
      const built = await timer.measure("serialization", async () =>
        getOrBuildSafeLiveGameQuestionBundle({
          roomId,
          questionSetId: binding.setId,
          questionSetVersion: binding.version,
          snapshot,
        }),
      );
      const responseBytes = Buffer.byteLength(JSON.stringify(built.bundle), "utf8");
      timer.setContext({
        responseBytes,
        supabaseQueryCount: queryCount,
        responseStrategy: built.bundleCacheOutcome,
        correctnessSource: snapshotHit ? "snapshot_cache_hit" : "snapshot_cache_miss",
      });
      console.info(
        JSON.stringify({
          type: "live_game_question_bundle_detail",
          roomId,
          questionSetId: binding.setId,
          questionSetVersion: binding.version,
          bundleCacheOutcome: built.bundleCacheOutcome,
          bundleGenerationStrategy: built.bundleCacheOutcome === "hit" ? "safe_bank_cache" : "build_from_snapshot",
          snapshotCacheOutcome: snapshotHit ? "hit" : "miss",
          queryCount,
          responseBytes,
        }),
      );

      return NextResponse.json(built.bundle, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      }
      console.error("Live-game question bundle preload failed", error);
      return NextResponse.json({ error: "Could not preload questions." }, { status: 503 });
    }
  });
}
