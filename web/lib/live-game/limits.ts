import type { LiveGameLobbyPlayer } from "@/lib/live-game/liveblocks/config";

/** Starter live-game entitlement. Keep product limits centralized for future teacher tiers. */
export const LIVE_GAME_MAX_HOSTS = 1;
export const LIVE_GAME_MAX_STUDENTS = 5;

export type LiveGameCapacity = {
  hostCount: number;
  studentCount: number;
  isRejoin: boolean;
  canJoinAsStudent: boolean;
};

export function getLiveGameCapacity(
  players: Record<string, LiveGameLobbyPlayer> | null | undefined,
  joiningPlayerId?: string,
): LiveGameCapacity {
  const entries = Object.entries(players ?? {});
  const hostCount = entries.filter(([, player]) => player.role === "host").length;
  const studentCount = entries.filter(([, player]) => player.role === "player").length;
  const isRejoin = Boolean(
    joiningPlayerId && entries.some(([id, player]) => id === joiningPlayerId && player.role === "player"),
  );

  return {
    hostCount,
    studentCount,
    isRejoin,
    canJoinAsStudent:
      hostCount === LIVE_GAME_MAX_HOSTS &&
      (isRejoin || studentCount < LIVE_GAME_MAX_STUDENTS),
  };
}
