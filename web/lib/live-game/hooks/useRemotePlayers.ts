"use client";

import { useOthers } from "@liveblocks/react/suspense";
import type { LiveGamePresence } from "@/lib/live-game/liveblocks/config";
import { LIVE_GAME_DEFAULT_AVATAR_ID } from "@/lib/live-game/characters/boy-character";

export type RemotePlayerState = {
  connectionId: number;
  x: number;
  y: number;
  direction: LiveGamePresence["direction"];
  isMoving: boolean;
  color: string;
  name: string;
  avatarId: string;
};

type PlayerMeta = {
  color: string;
  name: string;
};

function readPresence(presence: unknown): LiveGamePresence | null {
  if (!presence || typeof presence !== "object") return null;
  const p = presence as Partial<LiveGamePresence>;
  if (typeof p.x !== "number" || typeof p.y !== "number") return null;
  return {
    x: p.x,
    y: p.y,
    direction: p.direction ?? "down",
    isMoving: p.isMoving ?? false,
    animation: p.animation ?? "idle",
    avatarId: p.avatarId ?? LIVE_GAME_DEFAULT_AVATAR_ID,
  };
}

export function useRemotePlayers(playerMetaByUserId: Map<string, PlayerMeta>) {
  const others = useOthers();

  const remotes: RemotePlayerState[] = others
    .map((other) => {
      const presence = readPresence(other.presence);
      if (!presence) return null;
      const meta = playerMetaByUserId.get(other.id ?? "") ?? {
        color: "#3b82f6",
        name: "Player",
      };
      return {
        connectionId: other.connectionId,
        x: presence.x,
        y: presence.y,
        direction: presence.direction,
        isMoving: presence.isMoving,
        color: meta.color,
        name: meta.name,
        avatarId: presence.avatarId,
      };
    })
    .filter((entry): entry is RemotePlayerState => entry !== null);

  return remotes;
}
