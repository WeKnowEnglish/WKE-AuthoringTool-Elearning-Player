"use client";

import type { LiveGameAuthRole } from "@/lib/live-game/liveblocks/auth-policy";
import { LIVE_GAME_ROOM_PREFIX } from "@/lib/liveblocks/room-prefix";

const SESSION_CONTEXT_KEY = "wke-live-game-session-context";

/** Neutral roster dot when color picker is not shown. */
export const LIVE_GAME_DEFAULT_PLAYER_COLOR = "#64748b";

export type LiveGameSessionContext = {
  sessionId: string;
  role: LiveGameAuthRole;
  displayName: string;
  color: string;
  userId: string;
  avatarId: string;
  modeId: "english_craft";
  mapId: string;
  durationMinutes: number;
};

export function setLiveGameSessionContext(context: LiveGameSessionContext): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_CONTEXT_KEY, JSON.stringify(context));
}

export function getLiveGameSessionContext(): LiveGameSessionContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LiveGameSessionContext;
    if (
      typeof parsed.sessionId !== "string" ||
      (parsed.role !== "host" && parsed.role !== "player") ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.color !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.avatarId !== "string" ||
      parsed.modeId !== "english_craft" ||
      typeof parsed.mapId !== "string" ||
      typeof parsed.durationMinutes !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getLiveGameRoleForRoom(room: string): LiveGameAuthRole {
  const context = getLiveGameSessionContext();
  if (!context) return "player";
  const sessionId = room.replace(LIVE_GAME_ROOM_PREFIX, "");
  return context.sessionId === sessionId ? context.role : "player";
}

export function getLiveGameDisplayNameForRoom(room: string): string {
  const context = getLiveGameSessionContext();
  if (!context) return "Guest";
  const sessionId = room.replace(LIVE_GAME_ROOM_PREFIX, "");
  return context.sessionId === sessionId ? context.displayName : "Guest";
}
