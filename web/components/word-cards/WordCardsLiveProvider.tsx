"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { getVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";
import { getWordCardsSessionContext } from "@/lib/word-cards/client-context";

export function WordCardsLiveProvider({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        if (!room) throw new Error("Missing Liveblocks room id.");
        const wc = getWordCardsSessionContext();
        const vc = getVirtualClassroomContext();
        const response = await fetch("/api/liveblocks/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            userId: wc?.userId ?? vc?.userId ?? "guest",
            displayName: wc?.displayName ?? vc?.displayName ?? "Guest",
            role: wc?.role === "host" || vc?.role === "host" ? "host" : "player",
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
