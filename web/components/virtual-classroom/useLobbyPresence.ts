"use client";

import { useEffect, useRef } from "react";

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
  const joinedSessionId = useRef<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId.trim()) return;
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (joinedSessionId.current !== sessionId) {
      joinedSessionId.current = sessionId;
      void postLobbyPresence(sessionId, "join");
    }
    return () => {
      // React development mode deliberately remounts effects. Deferring the
      // leave lets that probe reuse the same attendance record, while a real
      // exit still records a leave promptly.
      leaveTimer.current = setTimeout(() => {
        void postLobbyPresence(sessionId, "leave");
        if (joinedSessionId.current === sessionId) joinedSessionId.current = null;
        leaveTimer.current = null;
      }, 250);
    };
  }, [sessionId, enabled]);
}
