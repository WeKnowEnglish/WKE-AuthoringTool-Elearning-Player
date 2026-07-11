import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  formatHostCookieValue,
  LIVE_GAME_HOST_COOKIE_NAME,
} from "@/lib/live-game/liveblocks/host-cookie";
import { generateJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { getModeConfig } from "@/lib/live-game/modes";
import type { LiveGameModeId } from "@/lib/live-game/modes/types";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";

type HostRequestBody = {
  displayName?: string;
  userId?: string;
  modeId?: string;
  durationMinutes?: number;
};

function parseHostRequestBody(
  body: unknown,
): {
  displayName: string;
  userId: string;
  modeId: LiveGameModeId;
  durationMinutes: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as HostRequestBody;
  const displayName = record.displayName?.trim() ?? "";
  const userId = record.userId?.trim() ?? "";
  const modeId = record.modeId === "english_craft" ? "english_craft" : null;
  const durationMinutes =
    typeof record.durationMinutes === "number" && record.durationMinutes > 0 ?
      Math.min(60, Math.round(record.durationMinutes))
    : 20;
  if (!displayName || !userId || !modeId) return null;
  return { displayName, userId, modeId, durationMinutes };
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
      { error: "displayName, userId, and modeId are required." },
      { status: 400 },
    );
  }

  const mode = getModeConfig(parsed.modeId);
  const sessionId = generateJoinCode();
  const hostSecret = randomBytes(24).toString("hex");
  const roomId = toRoomId(sessionId);

  const response = NextResponse.json({
    sessionId,
    joinCode: sessionId,
    roomId,
    userId: parsed.userId,
    displayName: parsed.displayName,
    modeId: parsed.modeId,
    mapId: mode.defaultMapId,
    durationMinutes: parsed.durationMinutes,
  });

  response.cookies.set(
    LIVE_GAME_HOST_COOKIE_NAME,
    formatHostCookieValue(sessionId, hostSecret),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  );

  return response;
}
