import { Liveblocks } from "@liveblocks/node";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseLiveblocksAuthRequest } from "@/lib/board-game/liveblocks/auth-context";
import { canAccessRoom } from "@/lib/board-game/liveblocks/auth-policy";
import { HOST_COOKIE_NAME } from "@/lib/board-game/liveblocks/host-cookie";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";

export async function POST(request: Request) {
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

  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(HOST_COOKIE_NAME)?.value ?? null;

  if (
    !canAccessRoom({
      room: authRequest.room,
      role: authRequest.role,
      hostCookie,
    })
  ) {
    return NextResponse.json({ error: "Not authorized for this room." }, { status: 403 });
  }

  const liveblocks = new Liveblocks({ secret });
  const session = liveblocks.prepareSession(authRequest.userId, {
    userInfo: {
      name: authRequest.displayName,
      role: authRequest.role,
    },
  });

  session.allow(authRequest.room, session.FULL_ACCESS);

  const { status, body: responseBody } = await session.authorize();
  return new NextResponse(responseBody, { status });
}
