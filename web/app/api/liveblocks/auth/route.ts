import { Liveblocks } from "@liveblocks/node";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessRoom as canAccessBoardGameRoom } from "@/lib/board-game/liveblocks/auth-policy";
import { HOST_COOKIE_NAME as BOARD_GAME_HOST_COOKIE } from "@/lib/board-game/liveblocks/host-cookie";
import { parseLiveblocksAuthRequest } from "@/lib/board-game/liveblocks/auth-context";
import { getRoomProduct } from "@/lib/liveblocks/room-prefix";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { verifyLiveGamePlayerToken, LIVE_GAME_PLAYER_COOKIE_NAME } from "@/lib/live-game/server/player-session";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

export async function POST(request: Request) {
  return withLiveGameServerTiming("liveblocks_auth", async (timer) => {
    let secret: string;
    try {
      secret = assertLiveblocksSecret();
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

    const authRequest = parseLiveblocksAuthRequest(body);
    if (!authRequest) {
      return NextResponse.json({ error: "Invalid auth payload." }, { status: 400 });
    }

    timer.setContext({ roomId: authRequest.room, role: authRequest.role });

    const cookieStore = await timer.measure("auth", () => cookies());
    const product = getRoomProduct(authRequest.room);

    let authorized = false;
    if (product === "board-game") {
      const hostCookie = cookieStore.get(BOARD_GAME_HOST_COOKIE)?.value ?? null;
      authorized = canAccessBoardGameRoom({
        room: authRequest.room,
        role: authRequest.role,
        hostCookie,
      });
    } else if (product === "live-game") {
      const playerSession = verifyLiveGamePlayerToken(
        cookieStore.get(LIVE_GAME_PLAYER_COOKIE_NAME)?.value,
      );
      authorized = playerSession?.roomId === authRequest.room;
      if (authorized && playerSession) {
        authRequest.userId = playerSession.playerId;
        authRequest.displayName = playerSession.displayName;
        authRequest.role = playerSession.role;
        timer.setContext({ role: playerSession.role });
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Not authorized for this room." }, { status: 403 });
    }

    const { status, body: responseBody } = await timer.measure("liveblocks_authorize", async () => {
      const liveblocks = new Liveblocks({ secret });
      const session = liveblocks.prepareSession(authRequest.userId, {
        userInfo: {
          name: authRequest.displayName,
          role: authRequest.role,
        },
      });

      session.allow(
        authRequest.room,
        product === "live-game" ?
          ["room:read", "storage:read", "room:presence:write"]
        : session.FULL_ACCESS,
      );

      return session.authorize();
    });
    return new NextResponse(responseBody, { status });
  });
}
