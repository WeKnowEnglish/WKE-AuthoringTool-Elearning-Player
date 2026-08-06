"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { WHITEBOARD_ROOM_PREFIX } from "@/lib/liveblocks/room-prefix";
import { getVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";
import {
  getOrCreateWhiteboardUserId,
  getWhiteboardDisplayNameForRoom,
  getWhiteboardRoleForRoom,
  getWhiteboardSessionContext,
} from "@/lib/whiteboard/liveblocks/identity";

/**
 * Single LiveblocksProvider for the VC session tree.
 * Auth switches by room prefix so Learn can open a nested whiteboard RoomProvider
 * without nesting another LiveblocksProvider (which Liveblocks forbids).
 */
export function VirtualClassroomLiveProvider({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        if (!room) throw new Error("Missing Liveblocks room id.");

        let userId: string;
        let displayName: string;
        let role: "host" | "player";

        if (room.startsWith(WHITEBOARD_ROOM_PREFIX)) {
          const wb = getWhiteboardSessionContext();
          userId = wb?.userId ?? getOrCreateWhiteboardUserId();
          displayName = getWhiteboardDisplayNameForRoom(room);
          role = getWhiteboardRoleForRoom(room);
        } else {
          const context = getVirtualClassroomContext();
          userId = context?.userId ?? "guest";
          displayName = context?.displayName ?? "Guest";
          role = context?.role === "host" ? "host" : "player";
        }

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
