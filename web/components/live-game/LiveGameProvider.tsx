"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import {
  getLiveGameDisplayNameForRoom,
  getLiveGameRoleForRoom,
  getLiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

type Props = {
  children: ReactNode;
};

export function LiveGameProvider({ children }: Props) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        if (!room) {
          throw new Error("Missing Liveblocks room id.");
        }
        const context = getLiveGameSessionContext();
        if (!context?.userId) {
          throw new Error("Join the live game from the host or join screen first.");
        }
        const displayName = getLiveGameDisplayNameForRoom(room);
        const role = getLiveGameRoleForRoom(room);

        recordLiveGameDiagnostic("room", "liveblocks_auth_requested", { room });
        const response = await diagnosticFetch("/api/liveblocks/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            userId: context.userId,
            displayName,
            role,
          }),
        }, { phase: "room", name: "liveblocks_auth", detail: { room } });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Could not authenticate with Liveblocks.");
        }

        const payload = await response.json();
        recordLiveGameDiagnostic("room", "liveblocks_auth_ready", { room });
        return payload;
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
