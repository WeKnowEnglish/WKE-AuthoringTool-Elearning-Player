import { NextResponse } from "next/server";
import { toLiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { roomId?: string; avatarId?: string };
    if (!body.roomId || !body.avatarId) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const identity = await requireLiveGamePlayerSession(body.roomId);
    const avatarId = toLiveGameCharacterId(body.avatarId);
    let applied = false;
    await getLiveblocksServerClient().mutateStorage(body.roomId, ({ root }) => {
      const liveRoot = root as unknown as { get(key: string): unknown };
      const session = liveRoot.get("session") as { get(k: string): unknown } | undefined;
      const players = liveRoot.get("players") as unknown as {
        get(id: string): { set(k: string, value: unknown): void } | undefined;
      };
      if (session?.get("phase") !== "lobby") return;
      const player = players?.get(identity.playerId);
      if (!player) return;
      player.set("avatarId", avatarId);
      applied = true;
    });
    return applied ? NextResponse.json({ ok: true, avatarId }) : NextResponse.json({ error: "Avatar cannot be changed." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
}
