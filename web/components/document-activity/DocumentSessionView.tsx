"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DocumentActivityShell } from "@/components/document-activity/DocumentActivityShell";
import { DocumentLiveProvider } from "@/components/document-activity/DocumentLiveProvider";
import { DocumentRoomShell } from "@/components/document-activity/DocumentRoomShell";
import {
  getDocumentSessionContext,
  setDocumentSessionContext,
  type DocumentSessionContext,
} from "@/lib/document-activity/client-context";
import { getVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";

function createClientInstanceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `client-${Date.now()}`;
}

export function DocumentSessionView() {
  const params = useParams<{ roundId: string }>();
  const router = useRouter();
  const roundId = params.roundId ?? "";

  const [bootstrapped, setBootstrapped] = useState(false);
  const [context, setContext] = useState<DocumentSessionContext | null>(null);
  const [clientInstanceId, setClientInstanceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setClientInstanceId(createClientInstanceId());
      const existing = getDocumentSessionContext();
      if (existing && existing.roundId === roundId) {
        if (!cancelled) {
          setContext(existing);
          setBootstrapped(true);
        }
        return;
      }

      // Guest / refresh restore via VC cookies
      try {
        const vc = getVirtualClassroomContext();
        const res = await fetch(`/api/document/${roundId}/enter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: vc?.userId,
            displayName: vc?.displayName,
          }),
        });
        const payload = (await res.json()) as {
          error?: string;
          roundId?: string;
          roomId?: string;
          vcSessionId?: string;
          userId?: string;
          displayName?: string;
          role?: "host" | "player";
        };
        if (!res.ok || !payload.roundId || !payload.roomId || !payload.userId) {
          throw new Error(payload.error ?? "Could not restore document session.");
        }
        const next: DocumentSessionContext = {
          roundId: payload.roundId,
          roomId: payload.roomId,
          vcSessionId: payload.vcSessionId ?? vc?.sessionId ?? "",
          role: payload.role ?? "player",
          userId: payload.userId,
          displayName: payload.displayName ?? "Student",
          color: payload.role === "host" ? "#0f172a" : "#0f766e",
        };
        setDocumentSessionContext(next);
        if (!cancelled) {
          setContext(next);
          setBootstrapped(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open document.");
          setBootstrapped(true);
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [roundId]);

  if (!bootstrapped || !clientInstanceId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-700">
        Loading document…
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
        <p className="text-lg font-bold text-slate-900">{error ?? "Join from Virtual Classroom first."}</p>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          onClick={() => router.push("/virtual-classroom/join")}
        >
          Back to join
        </button>
      </div>
    );
  }

  return (
    <DocumentLiveProvider>
      <DocumentRoomShell
        roomId={context.roomId}
        roundId={context.roundId}
        vcSessionId={context.vcSessionId}
        role={context.role}
        displayName={context.displayName}
        hostUserId={context.role === "host" ? context.userId : "host-pending"}
        clientInstanceId={clientInstanceId}
      >
        <DocumentActivityShell
          roundId={context.roundId}
          role={context.role}
          userId={context.userId}
          displayName={context.displayName}
          vcSessionId={context.vcSessionId}
        />
      </DocumentRoomShell>
    </DocumentLiveProvider>
  );
}
