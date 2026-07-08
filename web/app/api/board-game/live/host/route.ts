import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  formatHostCookieValue,
  HOST_COOKIE_NAME,
} from "@/lib/board-game/liveblocks/host-cookie";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { toRoomId } from "@/lib/board-game/liveblocks/room-id";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";

type HostRequestBody = {
  displayName?: string;
  userId?: string;
};

function parseHostRequestBody(body: unknown): { displayName: string; userId: string } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as HostRequestBody;
  const displayName = record.displayName?.trim() ?? "";
  const userId = record.userId?.trim() ?? "";
  if (!displayName || !userId) return null;
  return { displayName, userId };
}

export async function POST(request: Request) {
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

  const parsed = parseHostRequestBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "displayName and userId are required." },
      { status: 400 },
    );
  }

  const sessionId = generateJoinCode();
  const hostSecret = randomBytes(24).toString("hex");
  const roomId = toRoomId(sessionId);

  const response = NextResponse.json({
    sessionId,
    joinCode: sessionId,
    roomId,
    userId: parsed.userId,
    displayName: parsed.displayName,
  });

  response.cookies.set(HOST_COOKIE_NAME, formatHostCookieValue(sessionId, hostSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
