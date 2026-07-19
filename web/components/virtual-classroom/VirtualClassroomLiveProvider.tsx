"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { getVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";

export function VirtualClassroomLiveProvider({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        if (!room) throw new Error("Missing Liveblocks room id.");
        const context = getVirtualClassroomContext();
        const response = await fetch("/api/liveblocks/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            userId: context?.userId ?? "guest",
            displayName: context?.displayName ?? "Guest",
            role: context?.role === "host" ? "host" : "player",
          }),
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
