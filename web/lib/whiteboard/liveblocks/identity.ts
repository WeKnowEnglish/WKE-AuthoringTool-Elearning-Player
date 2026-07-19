"use client";

import type { WhiteboardAuthRole } from "@/lib/whiteboard/domain";
import { sessionIdFromWhiteboardRoom } from "@/lib/whiteboard/liveblocks/room-id";

const USER_ID_KEY = "wke-whiteboard-user-id";
const SESSION_CONTEXT_KEY = "wke-whiteboard-session-context";

export type WhiteboardSessionContext = {
  sessionId: string;
  roomId: string;
  role: WhiteboardAuthRole;
  displayName: string;
  color: string;
  userId: string;
  /** Present when WHITEBOARD_LARGE_CLASS_ROOMS is active. */
  controlRoomId?: string | null;
  boardRoomId?: string | null;
  roomStrategy?: "single_room" | "per_board_rooms";
};

function createGuestUserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateWhiteboardUserId(): string {
  if (typeof window === "undefined") return "guest-server";
  const existing = window.sessionStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const next = createGuestUserId();
  window.sessionStorage.setItem(USER_ID_KEY, next);
  return next;
}

export function setWhiteboardSessionContext(context: WhiteboardSessionContext): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_CONTEXT_KEY, JSON.stringify(context));
}

export function getWhiteboardSessionContext(): WhiteboardSessionContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WhiteboardSessionContext;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.roomId !== "string" ||
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

function contextMatchesRoom(context: WhiteboardSessionContext, room: string): boolean {
  if (context.roomId === room) return true;
  if (context.controlRoomId && context.controlRoomId === room) return true;
  if (context.boardRoomId && context.boardRoomId === room) return true;
  return sessionIdFromWhiteboardRoom(room) === context.sessionId;
}

export function getWhiteboardRoleForRoom(room: string): WhiteboardAuthRole {
  const context = getWhiteboardSessionContext();
  if (!context || !contextMatchesRoom(context, room)) return "player";
  return context.role;
}

export function getWhiteboardDisplayNameForRoom(room: string): string {
  const context = getWhiteboardSessionContext();
  if (!context || !contextMatchesRoom(context, room)) return "Guest";
  return context.displayName;
}

export { pickStudentColor } from "@/lib/whiteboard/colors";
