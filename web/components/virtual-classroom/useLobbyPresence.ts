"use client";

import { useEffect } from "react";

async function postLobbyPresence(
  sessionId: string,
  event: "join" | "leave",
): Promise<void> {
  try {
    await fetch(`/api/virtual-classroom/${encodeURIComponent(sessionId)}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
  } catch {
    // Never block waiting-room UX.
  }
}

export function useLobbyPresence(sessionId: string, enabled = true): void {
  useEffect(() => {
    if (!enabled || !sessionId.trim()) return;
    void postLobbyPresence(sessionId, "join");
    return () => {
      void postLobbyPresence(sessionId, "leave");
    };
  }, [sessionId, enabled]);
}
