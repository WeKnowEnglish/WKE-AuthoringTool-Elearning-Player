"use client";

import { useEffect, useRef, useState } from "react";
import { useOthers } from "@liveblocks/react/suspense";
import type { LiveGamePresence } from "@/lib/live-game/liveblocks/config";
import { LIVE_GAME_DEFAULT_AVATAR_ID } from "@/lib/live-game/characters/boy-character";
import { interpolateToward } from "@/lib/live-game/engine/interpolation";

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
  const interpolatedRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const [, bump] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (ts: number) => {
      const dtSec = Math.min(0.05, (ts - last) / 1000);
      last = ts;

      for (const other of others) {
        const presence = readPresence(other.presence);
        if (!presence) continue;
        const current = interpolatedRef.current.get(other.connectionId) ?? {
          x: presence.x,
          y: presence.y,
        };
        interpolatedRef.current.set(
          other.connectionId,
          interpolateToward(current, { x: presence.x, y: presence.y }, dtSec),
        );
      }

      bump((n) => n + 1);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [others]);

  const remotes: RemotePlayerState[] = others
    .map((other) => {
      const presence = readPresence(other.presence);
      if (!presence) return null;
      const interpolated = interpolatedRef.current.get(other.connectionId) ?? {
        x: presence.x,
        y: presence.y,
      };
      const meta = playerMetaByUserId.get(other.id ?? "") ?? {
        color: "#3b82f6",
        name: "Player",
      };
      return {
        connectionId: other.connectionId,
        x: interpolated.x,
        y: interpolated.y,
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
