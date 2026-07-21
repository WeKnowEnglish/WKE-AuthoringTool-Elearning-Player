"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WordCardsActivityShell } from "@/components/word-cards/WordCardsActivityShell";
import { WordCardsLiveProvider } from "@/components/word-cards/WordCardsLiveProvider";
import { WordCardsRoomShell } from "@/components/word-cards/WordCardsRoomShell";
import { getVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";
import {
  getWordCardsSessionContext,
  setWordCardsSessionContext,
  type WordCardsSessionContext,
} from "@/lib/word-cards/client-context";

function createClientInstanceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `client-${Date.now()}`;
}

export function WordCardsSessionView() {
  const params = useParams<{ joinCode: string }>();
  const joinCode = (params.joinCode ?? "").toUpperCase();

  const [bootstrapped, setBootstrapped] = useState(false);
  const [context, setContext] = useState<WordCardsSessionContext | null>(null);
  const [clientInstanceId, setClientInstanceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setClientInstanceId(createClientInstanceId());
      const existing = getWordCardsSessionContext();
      if (existing && existing.joinCode.toUpperCase() === joinCode) {
        if (!cancelled) {
          setContext(existing);
          setBootstrapped(true);
        }
        return;
      }

      try {
        const vc = getVirtualClassroomContext();
        const res = await fetch(`/api/word-cards/${joinCode}/enter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: vc?.userId,
            displayName: vc?.displayName,
          }),
        });
        const payload = (await res.json()) as {
          error?: string;
          joinCode?: string;
          roundId?: string;
          roomId?: string;
          vcSessionId?: string;
          userId?: string;
          displayName?: string;
          role?: "host" | "player";
        };
        if (!res.ok || !payload.joinCode || !payload.roomId || !payload.userId || !payload.roundId) {
          throw new Error(payload.error ?? "Could not restore word cards session.");
        }
        const next: WordCardsSessionContext = {
          joinCode: payload.joinCode,
          roundId: payload.roundId,
          roomId: payload.roomId,
          vcSessionId: payload.vcSessionId ?? vc?.sessionId ?? "",
          role: payload.role ?? "player",
          userId: payload.userId,
          displayName: payload.displayName ?? "Student",
          color: payload.role === "host" ? "#0f172a" : "#0f766e",
        };
        setWordCardsSessionContext(next);
        if (!cancelled) {
          setContext(next);
          setBootstrapped(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open word cards.");
          setBootstrapped(true);
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [joinCode]);

  if (!bootstrapped || !clientInstanceId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-700">
        Loading word cards…
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-slate-100 p-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Could not open word cards</p>
        <p className="max-w-md text-sm text-slate-600">{error ?? "Missing session."}</p>
      </div>
    );
  }

  return (
    <WordCardsLiveProvider>
      <WordCardsRoomShell
        roomId={context.roomId}
        roundId={context.roundId}
        joinCode={context.joinCode}
        vcSessionId={context.vcSessionId}
        role={context.role}
        displayName={context.displayName}
        hostUserId={context.userId}
        clientInstanceId={clientInstanceId}
      >
        <WordCardsActivityShell
          joinCode={context.joinCode}
          roundId={context.roundId}
          role={context.role}
          userId={context.userId}
          displayName={context.displayName}
          vcSessionId={context.vcSessionId}
        />
      </WordCardsRoomShell>
    </WordCardsLiveProvider>
  );
}
