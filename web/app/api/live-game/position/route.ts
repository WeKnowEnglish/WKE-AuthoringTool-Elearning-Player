import { LiveMap, LiveObject } from "@liveblocks/client";
import { NextResponse } from "next/server";
import type { LiveGamePlayerPosition } from "@/lib/live-game/liveblocks/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { roomId?: string; x?: number; y?: number };
    if (!body.roomId || !Number.isFinite(body.x) || !Number.isFinite(body.y)) {
      return NextResponse.json({ error: "Invalid position." }, { status: 400 });
    }
    const identity = await requireLiveGamePlayerSession(body.roomId);
    const x = Math.max(0, Math.min(1600, body.x as number));
    const y = Math.max(0, Math.min(1200, body.y as number));
    let accepted = false;
    await getLiveblocksServerClient().mutateStorage(body.roomId, ({ root }) => {
      const liveRoot = root as unknown as { get(key: string): unknown; set(key: string, value: unknown): void };
      let positions = liveRoot.get("playerPositions") as LiveMap<string, LiveObject<LiveGamePlayerPosition>> | undefined;
      if (!positions) {
        positions = new LiveMap();
        liveRoot.set("playerPositions", positions);
      }
      const position = positions.get(identity.playerId);
      const next = { x, y, updatedAt: Date.now() };
      if (position) {
        position.update(next);
      } else {
        positions.set(identity.playerId, new LiveObject(next));
      }
      accepted = true;
    });
    return accepted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Position rejected." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
}
