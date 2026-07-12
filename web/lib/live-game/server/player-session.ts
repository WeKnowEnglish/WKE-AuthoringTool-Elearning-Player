import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import type { LiveGameAuthRole } from "@/lib/live-game/liveblocks/auth-policy";
import { sessionIdFromRoomId, toRoomId } from "@/lib/live-game/liveblocks/room-id";

export const LIVE_GAME_PLAYER_COOKIE_NAME = "wke-live-game-player";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type LiveGamePlayerSession = {
  roomId: string;
  playerId: string;
  role: LiveGameAuthRole;
  displayName: string;
  expiresAt: number;
  accountType: "authenticated" | "guest";
  accountUserId: string | null;
};

function signingKey(): string {
  return `live-game-player-session:${assertLiveblocksSecret()}`;
}

function signature(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createLiveGamePlayerToken(input: Omit<LiveGamePlayerSession, "expiresAt">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyLiveGamePlayerToken(token: string | null | undefined): LiveGamePlayerSession | null {
  if (!token) return null;
  const [payload, suppliedSignature, ...rest] = token.split(".");
  if (!payload || !suppliedSignature || rest.length > 0) return null;
  const expected = signature(payload);
  const suppliedBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return null;
  }
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<LiveGamePlayerSession>;
    if (
      typeof value.roomId !== "string" ||
      !sessionIdFromRoomId(value.roomId) ||
      typeof value.playerId !== "string" ||
      !value.playerId ||
      (value.role !== "host" && value.role !== "player") ||
      typeof value.displayName !== "string" ||
      typeof value.expiresAt !== "number" ||
      (value.accountType !== "authenticated" && value.accountType !== "guest") ||
      (value.accountUserId !== null && typeof value.accountUserId !== "string") ||
      (value.accountType === "authenticated" && !value.accountUserId) ||
      (value.accountType === "guest" && value.accountUserId !== null) ||
      value.expiresAt <= Date.now()
    ) return null;
    return value as LiveGamePlayerSession;
  } catch {
    return null;
  }
}

export function canRecordLiveGameMastery(session: LiveGamePlayerSession): boolean {
  return session.accountType === "authenticated" && typeof session.accountUserId === "string";
}

export async function getLiveGamePlayerSession(): Promise<LiveGamePlayerSession | null> {
  const store = await cookies();
  return verifyLiveGamePlayerToken(store.get(LIVE_GAME_PLAYER_COOKIE_NAME)?.value);
}

export async function requireLiveGamePlayerSession(roomId: string): Promise<LiveGamePlayerSession> {
  const session = await getLiveGamePlayerSession();
  if (!session || session.roomId !== roomId) throw new Error("LIVE_GAME_UNAUTHORIZED");
  return session;
}

export function liveGamePlayerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function roomIdForSession(sessionId: string): string {
  return toRoomId(sessionId.trim().toUpperCase());
}
