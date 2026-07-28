"use client";

import type { LiveGameAuthRole } from "@/lib/live-game/liveblocks/auth-policy";
import {
  ENGLISH_CRAFT_DURATION_OPTIONS,
  type EnglishCraftSessionDuration,
} from "@/lib/live-game/modes/english-craft/config";
import { normalizeQuestionSetRefForSession } from "@/lib/live-game/question-banks/question-set-ids";
import { LIVE_GAME_ROOM_PREFIX } from "@/lib/liveblocks/room-prefix";
import type { LiveGameModeId } from "@/lib/live-game/modes/types";
import { isLiveGameModeId } from "@/lib/live-game/modes/registry";

const SESSION_CONTEXT_KEY = "wke-live-game-session-context";

/** Neutral roster dot when color picker is not shown. */
export const LIVE_GAME_DEFAULT_PLAYER_COLOR = "#64748b";

export type LiveGameSessionContext = {
  sessionId: string;
  role: LiveGameAuthRole;
  displayName: string;
  color: string;
  userId: string;
  classId?: string | null;
  classTitle?: string | null;
  avatarId: string;
  modeId: LiveGameModeId;
  mapId: string;
  durationMinutes: EnglishCraftSessionDuration;
  /** Canonical question-set uuid from host/join API. */
  questionSetId: string;
  questionSetVersion: number;
};

export function setLiveGameSessionContext(context: LiveGameSessionContext): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_CONTEXT_KEY, JSON.stringify(context));
}

export function clearLiveGameSessionContext(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_CONTEXT_KEY);
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
      (parsed.classId !== undefined && parsed.classId !== null && typeof parsed.classId !== "string") ||
      (parsed.classTitle !== undefined && parsed.classTitle !== null && typeof parsed.classTitle !== "string") ||
      typeof parsed.modeId !== "string" ||
      !isLiveGameModeId(parsed.modeId) ||
      typeof parsed.mapId !== "string" ||
      typeof parsed.questionSetId !== "string" ||
      parsed.questionSetId.trim().length === 0 ||
      typeof parsed.questionSetVersion !== "number" ||
      (parsed.durationMinutes !== null &&
        !ENGLISH_CRAFT_DURATION_OPTIONS.includes(
          parsed.durationMinutes as (typeof ENGLISH_CRAFT_DURATION_OPTIONS)[number],
        ))
    ) {
      return null;
    }
    return {
      ...parsed,
      questionSetId: normalizeQuestionSetRefForSession(parsed.questionSetId),
    };
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
