"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import {
  getOrCreateWhiteboardUserId,
  getWhiteboardDisplayNameForRoom,
  getWhiteboardRoleForRoom,
  getWhiteboardSessionContext,
} from "@/lib/whiteboard/liveblocks/identity";

type Props = { children: ReactNode };

export function WhiteboardLiveProvider({ children }: Props) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        if (!room) throw new Error("Missing Liveblocks room id.");
        const context = getWhiteboardSessionContext();
        const userId = context?.userId ?? getOrCreateWhiteboardUserId();
        const displayName = getWhiteboardDisplayNameForRoom(room);
        const role = getWhiteboardRoleForRoom(room);

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
