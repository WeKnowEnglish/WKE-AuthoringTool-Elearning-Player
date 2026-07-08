"use client";

import "@/liveblocks.config";
import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import {
  getLiveDisplayNameForRoom,
  getLiveRoleForRoom,
  getLiveSessionContext,
  getOrCreateLiveUserId,
} from "@/lib/board-game/liveblocks/identity";

type Props = {
  children: ReactNode;
};

export function BoardGameLiveProvider({ children }: Props) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        if (!room) {
          throw new Error("Missing Liveblocks room id.");
        }
        const context = getLiveSessionContext();
        const userId = context?.userId ?? getOrCreateLiveUserId();
        const displayName = getLiveDisplayNameForRoom(room);
        const role = getLiveRoleForRoom(room);

        const response = await fetch("/api/liveblocks/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, userId, displayName, role }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Could not authenticate with Liveblocks.");
        }

        return await response.json();
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
