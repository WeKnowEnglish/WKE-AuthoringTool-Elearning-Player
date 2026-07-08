"use client";

import type { LiveblocksAuthRole } from "@/lib/board-game/liveblocks/auth-policy";

const USER_ID_KEY = "wke-board-game-live-user-id";
const SESSION_CONTEXT_KEY = "wke-board-game-live-session-context";

export type LiveSessionContext = {
  sessionId: string;
  role: LiveblocksAuthRole;
  displayName: string;
  color: string;
  userId: string;
};

function createGuestUserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateLiveUserId(): string {
  if (typeof window === "undefined") return "guest-server";
  const existing = window.sessionStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const next = createGuestUserId();
  window.sessionStorage.setItem(USER_ID_KEY, next);
  return next;
}

export function setLiveSessionContext(context: LiveSessionContext): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_CONTEXT_KEY, JSON.stringify(context));
}

export function getLiveSessionContext(): LiveSessionContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LiveSessionContext;
    if (
      typeof parsed.sessionId !== "string" ||
      (parsed.role !== "host" && parsed.role !== "player") ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.color !== "string" ||
      typeof parsed.userId !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getLiveRoleForRoom(room: string): LiveblocksAuthRole {
  const context = getLiveSessionContext();
  if (!context) return "player";
  const sessionId = room.replace(/^wke-board-game-/, "");
  return context.sessionId === sessionId ? context.role : "player";
}

export function getLiveDisplayNameForRoom(room: string): string {
  const context = getLiveSessionContext();
  if (!context) return "Guest";
  const sessionId = room.replace(/^wke-board-game-/, "");
  return context.sessionId === sessionId ? context.displayName : "Guest";
}
