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
import { canAccessVirtualClassroomRoom } from "@/lib/virtual-classroom/auth-policy";
import {
  decodeVcMemberToken,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { getVirtualClassroomSessionByJoinCode } from "@/lib/virtual-classroom/server/session";
import { joinCodeFromVirtualClassroomRoom } from "@/lib/virtual-classroom/room-id";
import { canAccessDocumentRoom } from "@/lib/document-activity/auth-policy";
import { canAccessWhiteboardRoom } from "@/lib/whiteboard/liveblocks/auth-policy";
import {
  decodeWhiteboardPlayerToken,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import {
  canAccessWordCardsRoom,
  decodeWordCardsPlayerToken,
  WORD_CARDS_PLAYER_COOKIE,
} from "@/lib/word-cards/liveblocks/host-cookie";

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
    } else if (product === "virtual-classroom") {
      const hostCookie = cookieStore.get(VC_HOST_COOKIE)?.value ?? null;
      const memberCookie = cookieStore.get(VC_MEMBER_COOKIE)?.value ?? null;
      const joinCode = joinCodeFromVirtualClassroomRoom(authRequest.room);
      if (joinCode) {
        const session = await timer.measure("vc_session_lookup", () =>
          getVirtualClassroomSessionByJoinCode(joinCode),
        );
        if (session?.status === "ended") {
          authorized = false;
        } else {
          authorized = canAccessVirtualClassroomRoom({
            room: authRequest.room,
            role: authRequest.role,
            hostCookie,
            memberCookie,
          });
        }
      }
      const member = decodeVcMemberToken(memberCookie);
      if (authorized && member?.roomId === authRequest.room) {
        authRequest.userId = member.userId;
        authRequest.displayName = member.displayName;
        authRequest.role = member.role === "host" ? "host" : "player";
        timer.setContext({ role: authRequest.role });
      }
    } else if (product === "whiteboard") {
      const hostCookie = cookieStore.get(WHITEBOARD_HOST_COOKIE)?.value ?? null;
      const playerCookie = cookieStore.get(WHITEBOARD_PLAYER_COOKIE)?.value ?? null;
      authorized = canAccessWhiteboardRoom({
        room: authRequest.room,
        role: authRequest.role,
        hostCookie,
        playerCookie,
      });
      const player = decodeWhiteboardPlayerToken(playerCookie);
      if (authorized && player?.roomId === authRequest.room) {
        authRequest.userId = player.userId;
        authRequest.displayName = player.displayName;
        authRequest.role = player.role;
        timer.setContext({ role: player.role });
      }
    } else if (product === "document") {
      const hostCookie = cookieStore.get(VC_HOST_COOKIE)?.value ?? null;
      const memberCookie = cookieStore.get(VC_MEMBER_COOKIE)?.value ?? null;
      authorized = canAccessDocumentRoom({
        room: authRequest.room,
        role: authRequest.role,
        hostCookie,
        memberCookie,
      });
      const member = decodeVcMemberToken(memberCookie);
      if (authorized && member) {
        authRequest.userId = member.userId;
        authRequest.displayName = member.displayName;
        authRequest.role = member.role === "host" ? "host" : "player";
        timer.setContext({ role: authRequest.role });
      }
    } else if (product === "word-cards") {
      const playerCookie = cookieStore.get(WORD_CARDS_PLAYER_COOKIE)?.value ?? null;
      authorized = canAccessWordCardsRoom({
        room: authRequest.room,
        playerCookie,
      });
      const player = decodeWordCardsPlayerToken(playerCookie);
      if (authorized && player?.roomId === authRequest.room) {
        authRequest.userId = player.userId;
        authRequest.displayName = player.displayName;
        authRequest.role = player.role;
        timer.setContext({ role: player.role });
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
