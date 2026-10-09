"use client";

import { useStatus, useSyncStatus } from "@liveblocks/react";
import { Component, useEffect, useState, type ReactNode } from "react";
import { DocumentActivityShell } from "@/components/document-activity/DocumentActivityShell";
import { DocumentLiveProvider } from "@/components/document-activity/DocumentLiveProvider";
import { DocumentRoomShell } from "@/components/document-activity/DocumentRoomShell";
import type { DocumentSessionContext } from "@/lib/document-activity/client-context";

function DocumentSyncStatus() {
  const status = useStatus();
  const sync = useSyncStatus({ smooth: true });
  return (
    <p role="status" aria-live="polite" className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900">
      {status !== "connected"
        ? "Reconnecting to shared document — wait before writing."
        : sync === "synchronizing"
          ? "Saving shared changes…"
          : "Shared changes saved · Teacher and students can write together"}
    </p>
  );
}

class DocumentErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-bold">Could not connect to the shared document.</p>
        <button type="button" onClick={this.props.onRetry} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white">Reconnect document</button>
      </div>
    );
  }
}

/** Each classroom participant enters through current server authorization, including after refresh. */
export function VirtualClassroomDocumentEmbed({ roundId, isolatedLiveblocksProvider = false }: {
  roundId: string;
  isolatedLiveblocksProvider?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [context, setContext] = useState<DocumentSessionContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientInstanceId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/document/${roundId}/enter`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}",
        });
        const next = await response.json() as Partial<DocumentSessionContext> & { error?: string };
        if (!response.ok || !next.roomId || !next.userId || !next.vcSessionId || !next.role || next.roundId !== roundId) {
          throw new Error(next.error ?? "Could not open the shared document.");
        }
        if (!cancelled) {
          setContext({ roundId, roomId: next.roomId, vcSessionId: next.vcSessionId,
            userId: next.userId, displayName: next.displayName ?? "Participant", role: next.role,
            color: next.role === "host" ? "#0f172a" : "#0f766e" });
        }
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not open document.");
      }
    })();
    return () => { cancelled = true; };
  }, [attempt, roundId]);

  const retry = () => { setContext(null); setError(null); setAttempt(value => value + 1); };
  if (error) return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
      <p>{error}</p>
      <button type="button" onClick={retry} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white">Retry opening document</button>
    </div>
  );
  if (!context) return <p role="status" className="p-5">Opening shared document…</p>;
  const document = (
        <DocumentRoomShell roomId={context.roomId} roundId={roundId} vcSessionId={context.vcSessionId}
          role={context.role} displayName={context.displayName} hostUserId={context.userId} clientInstanceId={clientInstanceId}>
          <DocumentSyncStatus />
          <DocumentActivityShell roundId={roundId} vcSessionId={context.vcSessionId} role={context.role}
            userId={context.userId} displayName={context.displayName} embedded />
        </DocumentRoomShell>
  );
  return (
    <DocumentErrorBoundary key={attempt} onRetry={retry}>
      {isolatedLiveblocksProvider
        ? <DocumentLiveProvider identity={context}>{document}</DocumentLiveProvider>
        : document}
    </DocumentErrorBoundary>
  );
}

export function SharedDocumentLaunchPanel({ sessionId, onLaunched }: {
  sessionId: string; onLaunched: (roundId: string) => void;
}) {
  const [title, setTitle] = useState("Our class writing");
  const [instructions, setInstructions] = useState("Write together. Take turns adding ideas, then read and improve your sentences.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launch = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/virtual-classroom/${sessionId}/document`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), instructions: instructions.trim(),
          participationMode: "whole_class", templateType: "paragraph", startOpen: true }),
      });
      const next = await response.json() as { roundId?: string; error?: string };
      if (!response.ok || !next.roundId) throw new Error(next.error ?? "Could not start the shared document.");
      onLaunched(next.roundId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not start document.");
    } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-sky-200 bg-sky-50 p-5">
      <div><h2 className="text-lg font-bold text-slate-900">Shared document</h2>
        <p className="text-sm text-slate-600">One document for you and your students to write in together. It opens on everyone’s classroom screen.</p></div>
      <label className="block text-sm font-semibold">Document title
        <input value={title} onChange={event => setTitle(event.target.value)} disabled={busy} maxLength={160}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2" /></label>
      <label className="block text-sm font-semibold">Writing prompt
        <textarea value={instructions} onChange={event => setInstructions(event.target.value)} disabled={busy} maxLength={2000} rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2" /></label>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <button type="button" disabled={busy || !title.trim()} onClick={() => void launch()}
        className="rounded-lg bg-sky-800 px-4 py-2 font-bold text-white disabled:opacity-50">
        {busy ? "Opening document…" : "Start shared document"}
      </button>
    </div>
  );
}
