import { LiveObject } from "@liveblocks/client";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toLiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";
import { isValidJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import type { LiveGameLobbyPlayer, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  createLiveGamePlayerToken,
  getLiveGamePlayerSession,
  LIVE_GAME_PLAYER_COOKIE_NAME,
  liveGamePlayerCookieOptions,
} from "@/lib/live-game/server/player-session";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { createMovementState } from "@/lib/live-game/engine/movement";
import { getMapForMode } from "@/lib/live-game/modes";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    displayName?: string;
    avatarId?: string;
  } | null;
  const sessionId = body?.sessionId?.trim().toUpperCase() ?? "";
  const displayName = body?.displayName?.trim().slice(0, 80) ?? "";
  if (!isValidJoinCode(sessionId) || !displayName) {
    return NextResponse.json({ error: "Valid sessionId and displayName are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const roomId = toRoomId(sessionId);
  const snapshot = await readLiveGameStorageJson(roomId);
  if (!snapshot?.session) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (snapshot.session.phase !== "lobby") {
    return NextResponse.json({ error: "This game has already started." }, { status: 409 });
  }

  const existingIdentity = await getLiveGamePlayerSession();
  const playerId =
    user?.id ??
    (existingIdentity?.roomId === roomId && existingIdentity.role === "player" ?
      existingIdentity.playerId
    : `guest-${randomBytes(16).toString("hex")}`);
  const requestedAvatar = toLiveGameCharacterId(body?.avatarId ?? "");
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const liveRoot = root as unknown as { get(key: string): unknown };
    const players = root.get("players") as unknown as {
      get(id: string): unknown;
      set(id: string, value: LiveObject<LiveGameLobbyPlayer>): void;
    };
    if (!players?.get(playerId)) {
      players.set(playerId, new LiveObject<LiveGameLobbyPlayer>({
        name: displayName,
        color: "#64748b",
        role: "player",
        isReady: false,
        joinedAt: Date.now(),
        avatarId: requestedAvatar,
      }));
      const positions = liveRoot.get("playerPositions") as import("@liveblocks/client").LiveMap<string, LiveObject<{ x: number; y: number; updatedAt: number }>>;
      const spawn = createMovementState(
        getMapForMode(snapshot.session.mapId, snapshot.session.modeId),
        Object.keys(snapshot.players ?? {}).length,
      );
      positions?.set(playerId, new LiveObject({ ...spawn, updatedAt: Date.now() }));
    }
  });

  const response = NextResponse.json({
    sessionId,
    userId: playerId,
    role: "player",
    mapId: snapshot.session.mapId,
    modeId: snapshot.session.modeId,
    durationMinutes: snapshot.session.durationMinutes,
    questionSetId: snapshot.session.questionSetId,
    questionSetVersion: snapshot.session.questionSetVersion,
  } satisfies Partial<LiveGameStorageSnapshot["session"]> & { userId: string; role: "player"; sessionId: string });
  response.cookies.set(
    LIVE_GAME_PLAYER_COOKIE_NAME,
    createLiveGamePlayerToken({
      roomId,
      playerId,
      role: "player",
      displayName,
      accountType: user ? "authenticated" : "guest",
      accountUserId: user?.id ?? null,
    }),
    liveGamePlayerCookieOptions(),
  );
  return response;
}
