"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DocumentCollaborativeEditor,
  type DocumentEditorHandle,
} from "@/components/document-activity/DocumentCollaborativeEditor";
import { DocumentReviewPanel } from "@/components/document-activity/DocumentReviewPanel";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { clearDocumentSessionContext } from "@/lib/document-activity/client-context";
import {
  type DocumentPrompt,
  type DocumentRoundSettings,
  type DocumentScaffolds,
} from "@/lib/document-activity/domain";
import {
  canSubmitDocumentAsUser,
  documentIdForUserInRound,
  type DocumentGroupRecord,
} from "@/lib/document-activity/group-membership";
import type { DocumentFields } from "@/lib/document-activity/liveblocks/types";
import {
  canPushDocumentForReview,
  type DocumentReviewState,
} from "@/lib/document-activity/review";

type Props = {
  roundId: string;
  role: "host" | "player";
  userId: string;
  displayName: string;
  vcSessionId: string;
};

type RosterRow = {
  id: string;
  name: string;
  status: string;
  returnNote: string | null;
  ownerId: string;
  ownerType: string;
  memberIds: string[];
  readyCount: number;
  orphaned: boolean;
};

type MemberReady = { id: string; name: string; ready: boolean };

function readRuntime<T>(root: unknown, key: string): T | null {
  const runtime = (root as { runtime?: { get?: (k: string) => unknown } & Record<string, unknown> })
    .runtime;
  if (!runtime) return null;
  if (typeof runtime.get === "function") return (runtime.get(key) as T) ?? null;
  return ((runtime as Record<string, unknown>)[key] as T) ?? null;
}

function readDocField(
  documents: unknown,
  docId: string,
): { status: string | null; returnNote: string | null; ownerType: string | null; ownerId: string | null; displayName: string | null } | null {
  if (!documents || typeof documents !== "object") return null;
  const read = (raw: unknown) => {
    if (!raw) return null;
    const d = raw as DocumentFields & { get?: (k: string) => unknown };
    if (typeof d.get === "function") {
      return {
        status: (d.get("status") as string) ?? null,
        returnNote: (d.get("returnNote") as string | null) ?? null,
        ownerType: (d.get("ownerType") as string) ?? null,
        ownerId: (d.get("ownerId") as string) ?? null,
        displayName: (d.get("displayName") as string) ?? null,
      };
    }
    return {
      status: d.status ?? null,
      returnNote: d.returnNote ?? null,
      ownerType: d.ownerType ?? null,
      ownerId: d.ownerId ?? null,
      displayName: d.displayName ?? null,
    };
  };
  if (typeof (documents as { get?: unknown }).get === "function") {
    return read((documents as { get: (k: string) => unknown }).get(docId));
  }
  return read((documents as Record<string, unknown>)[docId]);
}

export function DocumentActivityShell({
  roundId,
  role,
  userId,
  displayName,
  vcSessionId,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<DocumentEditorHandle>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [returnNote, setReturnNote] = useState("Please revise using the success criteria.");
  const [inspectId, setInspectId] = useState<string | null>(null);

  const phase = useStorage((root) => readRuntime<string>(root, "phase") ?? "waiting");
  const participationMode = useStorage(
    (root) => readRuntime<string>(root, "participationMode") ?? "individual",
  );
  const settings = useStorage(
    (root) =>
      readRuntime<DocumentRoundSettings>(root, "settings") ?? {
        defaultTimerMs: 300000,
        anonymousCompareDefault: true,
        allowEarlySubmit: true,
        groupSubmitPolicy: "any_member" as const,
      },
  );
  const prompt = useStorage(
    (root) =>
      readRuntime<DocumentPrompt>(root, "prompt") ?? {
        title: "Document",
        instructions: "",
        successCriteria: "",
      },
  );
  const scaffolds = useStorage(
    (root) =>
      readRuntime<DocumentScaffolds>(root, "scaffolds") ?? {
        wordBank: [],
        sentenceStarters: [],
      },
  );
  const templateType = useStorage((root) => readRuntime<string>(root, "templateType") ?? "paragraph");
  const review = useStorage((root) => readRuntime<DocumentReviewState | null>(root, "review"));
  const hasReviewPush = Boolean(review && review.targetIds.length > 0);

  const groups = useStorage((root) => {
    const map = (root as { groups?: unknown }).groups;
    if (!map || typeof map !== "object") return [] as DocumentGroupRecord[];
    const out: DocumentGroupRecord[] = [];
    if (typeof (map as { entries?: unknown }).entries === "function") {
      for (const [id, raw] of (
        map as { entries: () => IterableIterator<[string, unknown]> }
      ).entries()) {
        const g = raw as { get?: (k: string) => unknown; name?: string; memberIds?: string[]; leaderId?: string | null };
        out.push({
          id,
          name: typeof g.get === "function" ? String(g.get("name") ?? id) : (g.name ?? id),
          memberIds:
            typeof g.get === "function"
              ? ((g.get("memberIds") as string[]) ?? []).slice()
              : (g.memberIds ?? []).slice(),
          leaderId:
            typeof g.get === "function"
              ? ((g.get("leaderId") as string | null) ?? null)
              : (g.leaderId ?? null),
        });
      }
      return out;
    }
    return Object.entries(map as Record<string, DocumentGroupRecord>).map(([id, g]) => ({
      id,
      name: g.name ?? id,
      memberIds: [...(g.memberIds ?? [])],
      leaderId: g.leaderId ?? null,
    }));
  });

  const participants = useStorage((root) => {
    const map = (root as { participants?: unknown }).participants;
    const byId: Record<string, MemberReady> = {};
    if (!map || typeof map !== "object") return byId;
    if (typeof (map as { entries?: unknown }).entries === "function") {
      for (const [id, raw] of (
        map as { entries: () => IterableIterator<[string, unknown]> }
      ).entries()) {
        const p = raw as { get?: (k: string) => unknown; name?: string; ready?: boolean };
        byId[id] = {
          id,
          name: typeof p.get === "function" ? String(p.get("name") ?? id) : (p.name ?? id),
          ready: typeof p.get === "function" ? Boolean(p.get("ready")) : Boolean(p.ready),
        };
      }
      return byId;
    }
    for (const [id, p] of Object.entries(map as Record<string, { name?: string; ready?: boolean }>)) {
      byId[id] = { id, name: p.name ?? id, ready: Boolean(p.ready) };
    }
    return byId;
  });

  const myReady = participants[userId]?.ready ?? false;

  const myDocId = useMemo(
    () =>
      documentIdForUserInRound({
        participationMode,
        userId,
        groups,
      }),
    [groups, participationMode, userId],
  );

  const myGroup = useMemo(
    () => groups.find((g) => g.memberIds.includes(userId)) ?? null,
    [groups, userId],
  );

  const myDoc = useStorage((root) => {
    if (!myDocId) return null;
    return readDocField((root as { documents?: unknown }).documents, myDocId);
  });

  const roster = useStorage((root) => {
    const documents = (root as { documents?: unknown }).documents;
    if (!documents || typeof documents !== "object") return [] as RosterRow[];

    const groupMap = (root as { groups?: unknown }).groups;
    const groupById = new Map<string, string[]>();
    if (groupMap && typeof groupMap === "object" && typeof (groupMap as { entries?: unknown }).entries === "function") {
      for (const [gid, raw] of (
        groupMap as { entries: () => IterableIterator<[string, unknown]> }
      ).entries()) {
        const g = raw as { get?: (k: string) => unknown; memberIds?: string[] };
        const memberIds =
          typeof g.get === "function"
            ? ((g.get("memberIds") as string[]) ?? [])
            : (g.memberIds ?? []);
        groupById.set(gid, memberIds);
      }
    }

    const partMap = (root as { participants?: unknown }).participants;
    const readyById = new Map<string, boolean>();
    if (partMap && typeof partMap === "object" && typeof (partMap as { entries?: unknown }).entries === "function") {
      for (const [pid, raw] of (
        partMap as { entries: () => IterableIterator<[string, unknown]> }
      ).entries()) {
        const p = raw as { get?: (k: string) => unknown; ready?: boolean };
        readyById.set(
          pid,
          typeof p.get === "function" ? Boolean(p.get("ready")) : Boolean(p.ready),
        );
      }
    }

    const out: RosterRow[] = [];
    const pushRow = (id: string, raw: unknown) => {
      const d = raw as DocumentFields & { get?: (k: string) => unknown };
      const ownerType =
        typeof d.get === "function" ? String(d.get("ownerType") ?? "student") : (d.ownerType ?? "student");
      const ownerId =
        typeof d.get === "function" ? String(d.get("ownerId") ?? "") : (d.ownerId ?? "");
      const status =
        typeof d.get === "function" ? String(d.get("status") ?? "waiting") : (d.status ?? "waiting");
      const name =
        typeof d.get === "function"
          ? String(d.get("displayName") ?? id)
          : (d.displayName ?? id);
      const memberIds = groupById.get(ownerId) ?? [];
      const readyCount = memberIds.filter((mid) => readyById.get(mid)).length;
      out.push({
        id,
        name,
        status,
        returnNote:
          typeof d.get === "function"
            ? ((d.get("returnNote") as string | null) ?? null)
            : (d.returnNote ?? null),
        ownerId,
        ownerType,
        memberIds,
        readyCount,
        // Orphan = group doc whose group was removed from Storage (not merely locked after Collect).
        orphaned: ownerType === "group" && !groupById.has(ownerId),
      });
    };
    if (typeof (documents as { entries?: unknown }).entries === "function") {
      for (const [id, raw] of (
        documents as { entries: () => IterableIterator<[string, unknown]> }
      ).entries()) {
        pushRow(id, raw);
      }
    } else {
      for (const [id, raw] of Object.entries(documents as Record<string, unknown>)) {
        pushRow(id, raw);
      }
    }
    return out.sort((a, b) => Number(a.orphaned) - Number(b.orphaned));
  });

  const visibleRoster = useMemo(() => {
    if (participationMode === "group") {
      return roster.filter((r) => r.ownerType === "group");
    }
    if (participationMode === "whole_class") {
      return roster.filter((r) => r.ownerType === "class");
    }
    return roster.filter((r) => r.ownerType === "student");
  }, [participationMode, roster]);

  const activeGroupIds = useMemo(() => groups.map((g) => g.id), [groups]);

  const canSelectForReview = useCallback(
    (row: RosterRow) =>
      !row.orphaned &&
      canPushDocumentForReview({
        status: row.status,
        ownerType: row.ownerType,
        ownerId: row.ownerId,
        activeGroupIds,
      }),
    [activeGroupIds],
  );

  const myStatus = myDoc?.status ?? null;
  const isMemberOwner =
    role === "player" &&
    Boolean(myDocId) &&
    (participationMode === "whole_class"
      ? myDoc?.ownerType === "class"
      : participationMode === "individual"
        ? myDoc?.ownerId === userId
        : Boolean(myGroup && myDoc?.ownerId === myGroup.id));

  const facing = studentFacingState({
    phase,
    workStatus: myStatus,
    hasReviewPush,
  });

  const canEdit = canEditActivityWork({
    phase,
    workStatus: myStatus,
    role,
    isOwner: isMemberOwner,
    hasReviewPush,
  });

  const readyMemberIds = useMemo(() => {
    if (!myGroup) return [] as string[];
    return myGroup.memberIds.filter((id) => participants[id]?.ready);
  }, [myGroup, participants]);

  const submitGate = useMemo(() => {
    if (!myDocId || !myDoc) return { ok: false as const, reason: "No document yet." };
    return canSubmitDocumentAsUser({
      participationMode,
      userId,
      documentOwnerType: myDoc.ownerType ?? "student",
      documentOwnerId: myDoc.ownerId ?? "",
      groups,
      groupSubmitPolicy: settings.groupSubmitPolicy ?? "any_member",
      readyMemberIds,
    });
  }, [groups, myDoc, myDocId, participationMode, readyMemberIds, settings.groupSubmitPolicy, userId]);

  const canSubmit =
    !hasReviewPush &&
    isMemberOwner &&
    submitGate.ok &&
    canSubmitActivityWork({
      phase,
      workStatus: myStatus,
      isOwner: true,
    });

  const editorField = useMemo(() => {
    if (hasReviewPush) return null;
    if (role === "player") return myDocId;
    if (inspectId) return inspectId;
    if (participationMode === "whole_class") {
      return visibleRoster.find((r) => r.ownerType === "class")?.id ?? null;
    }
    return null;
  }, [hasReviewPush, inspectId, myDocId, participationMode, role, visibleRoster]);

  const runTeacher = useCallback(
    async (command: Record<string, unknown>) => {
      setBusy(String(command.type));
      setError(null);
      try {
        const res = await fetch(`/api/document/${roundId}/commands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Command failed.");
        if (command.type === "COMPLETE") {
          clearDocumentSessionContext();
          router.push(`/teacher/virtual-classroom/${vcSessionId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      } finally {
        setBusy(null);
      }
    },
    [roundId, router, vcSessionId],
  );

  const submitWork = useCallback(async () => {
    if (!myDocId) return;
    setBusy("SUBMIT");
    setError(null);
    try {
      const payload = editorRef.current?.getPayload() ?? {
        contentJson: {},
        plainText: "",
        wordCount: 0,
      };
      const res = await fetch(`/api/document/${roundId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SUBMIT",
          documentId: myDocId,
          ...payload,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not submit.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }, [myDocId, roundId]);

  const toggleReady = useCallback(async () => {
    setBusy("SET_READY");
    setError(null);
    try {
      const res = await fetch(`/api/document/${roundId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SET_READY", ready: !myReady }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not update Ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }, [myReady, roundId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const backToClassroom = () => {
    router.push(
      role === "host"
        ? `/teacher/virtual-classroom/${vcSessionId}`
        : `/virtual-classroom/${vcSessionId}`,
    );
  };

  // Teacher Complete → completed; send host + students back to the classroom.
  useEffect(() => {
    if (phase !== "completed" || !vcSessionId) return;
    clearDocumentSessionContext();
    router.push(
      role === "host"
        ? `/teacher/virtual-classroom/${vcSessionId}`
        : `/virtual-classroom/${vcSessionId}`,
    );
  }, [phase, vcSessionId, role, router]);

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 to-slate-100">
      {hasReviewPush && (
        <DocumentReviewPanel
          roundId={roundId}
          role={role}
          userId={userId}
          busy={Boolean(busy)}
          onTeacherCommand={runTeacher}
        />
      )}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
            Document
            {participationMode === "group"
              ? " · Group"
              : participationMode === "whole_class"
                ? " · Whole class"
                : " · Individual"}
          </p>
          <h1 className="text-xl font-bold text-slate-900">{prompt.title}</h1>
          <p className="text-sm text-slate-600">
            {facing}
            {templateType ? ` · ${templateType.replaceAll("_", " ")}` : ""}
            {myGroup ? ` · ${myGroup.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {role === "host" && phase === "waiting" && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void runTeacher({ type: "OPEN" })}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "OPEN" ? "Opening…" : teacherControlLabel("OPEN")}
            </button>
          )}
          {role === "host" && (phase === "active" || phase === "revision") && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void runTeacher({ type: "COLLECT" })}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "COLLECT" ? "Collecting…" : teacherControlLabel("COLLECT")}
            </button>
          )}
          {role === "host" && (phase === "collected" || phase === "review") && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void runTeacher({ type: "REVISE" })}
              className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "REVISE" ? "Starting…" : teacherControlLabel("REVISE")}
            </button>
          )}
          {role === "host" && phase !== "completed" && phase !== "waiting" && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => {
                if (window.confirm("Complete this document round? Students return to the classroom.")) {
                  void runTeacher({ type: "COMPLETE" });
                }
              }}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "COMPLETE" ? "Completing…" : teacherControlLabel("COMPLETE")}
            </button>
          )}
          {role === "player" && participationMode === "group" && myGroup && !hasReviewPush && (
            <button
              type="button"
              disabled={Boolean(busy) || phase === "waiting" || phase === "collected" || phase === "completed"}
              onClick={() => void toggleReady()}
              className={`rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                myReady
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-300 bg-white text-slate-800"
              }`}
            >
              {busy === "SET_READY" ? "Saving…" : myReady ? "Ready ✓" : "Mark Ready"}
            </button>
          )}
          {role === "player" && canSubmit && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void submitWork()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "SUBMIT" ? "Submitting…" : "Submit"}
            </button>
          )}
          <button
            type="button"
            onClick={backToClassroom}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          >
            Back to classroom
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-4 p-4 md:grid-cols-[1fr_280px]">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Instructions</h2>
            <p className="mt-1 text-base text-slate-800">{prompt.instructions}</p>
          </div>
          {prompt.stimulus?.trim() ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Stimulus</h2>
              <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-slate-800">
                {prompt.stimulus.trim()}
              </p>
            </div>
          ) : null}
          {prompt.successCriteria && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Success criteria
              </h2>
              <p className="mt-1 text-base text-slate-800">{prompt.successCriteria}</p>
            </div>
          )}

          {(scaffolds.wordBank.length > 0 || scaffolds.sentenceStarters.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {scaffolds.wordBank.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Word bank</h3>
                  <p className="mt-1 text-sm text-slate-600">{scaffolds.wordBank.join(" · ")}</p>
                </div>
              )}
              {scaffolds.sentenceStarters.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Sentence starters</h3>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                    {scaffolds.sentenceStarters.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {role === "player" && participationMode === "group" && myGroup && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
              <p className="font-bold">{myGroup.name}</p>
              <p className="mt-1 text-xs">
                {myGroup.memberIds
                  .map((id) => {
                    const p = participants[id];
                    const label = p?.name ?? id.slice(0, 6);
                    return `${label}${p?.ready ? " ✓" : ""}`;
                  })
                  .join(" · ")}
              </p>
              {settings.groupSubmitPolicy !== "any_member" && (
                <p className="mt-1 text-xs text-slate-600">
                  Submit policy: {settings.groupSubmitPolicy.replaceAll("_", " ")}
                </p>
              )}
            </div>
          )}

          {role === "player" && myDoc?.returnNote && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
              <span className="font-bold">Teacher note: </span>
              {myDoc.returnNote}
            </div>
          )}

          {hasReviewPush ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/70 px-4 py-6 text-center">
              <p className="text-lg font-bold text-slate-900">Class review</p>
              <p className="mt-1 text-sm text-slate-600">
                Complete the review task above. Writing is paused while the class reviews.
              </p>
            </div>
          ) : role === "player" && participationMode === "group" && !myGroup ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center">
              <p className="text-lg font-bold text-slate-900">Waiting for a group</p>
              <p className="mt-1 text-sm text-slate-600">
                Ask your teacher to put you in a group and send groups to this document.
              </p>
            </div>
          ) : phase === "waiting" ? (
            <div className="rounded-lg border border-dashed border-sky-300 bg-sky-50/80 px-4 py-8 text-center">
              <p className="text-lg font-bold text-slate-900">Waiting</p>
              <p className="mt-1 text-sm text-slate-600">
                {role === "host"
                  ? participationMode === "whole_class"
                    ? "Students can read the prompt. Press Open when the class is ready to write together."
                    : "Students can read the prompt. Press Open when everyone is ready to write."
                  : participationMode === "whole_class"
                    ? "Read the instructions. You will write together when your teacher opens writing."
                    : "Read the instructions. Your teacher will open writing soon."}
              </p>
            </div>
          ) : editorField ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {role === "host"
                    ? participationMode === "whole_class"
                      ? "Class document"
                      : "Inspect document"
                    : participationMode === "group"
                      ? "Group writing"
                      : participationMode === "whole_class"
                        ? "Class writing"
                        : "Your writing"}
                </h2>
                {role === "player" && myStatus === "submitted" && (
                  <p className="text-xs font-semibold text-teal-800">Submitted — wait for class review</p>
                )}
              </div>
              <DocumentCollaborativeEditor
                key={editorField}
                ref={role === "player" ? editorRef : undefined}
                field={editorField}
                editable={role === "player" && canEdit}
              />
              {role === "player" &&
                !canSubmit &&
                canEdit &&
                submitGate.reason &&
                participationMode === "group" && (
                  <p className="text-sm text-amber-800">{submitGate.reason}</p>
                )}
              {role === "player" &&
                participationMode === "whole_class" &&
                canEdit &&
                (phase === "active" || phase === "revision") && (
                  <p className="text-sm text-slate-600">
                    Write together. Your teacher will collect when the class is ready — no Submit
                    button.
                  </p>
                )}
              {role === "player" && !canEdit && phase === "active" && myStatus === "submitted" && (
                <p className="text-sm text-slate-600">
                  You can re-read the scaffolds while you wait. Editing is locked until your teacher
                  returns work.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              {role === "host"
                ? `Select a ${
                    participationMode === "group"
                      ? "group"
                      : participationMode === "whole_class"
                        ? "class"
                        : "student"
                  } document from the roster to inspect.`
                : "No document available yet."}
            </div>
          )}
        </section>

        {role === "host" && (
          <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                {participationMode === "group"
                  ? "Groups"
                  : participationMode === "whole_class"
                    ? "Class document"
                    : "Roster"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {visibleRoster.length === 0
                  ? participationMode === "group"
                    ? "Send groups from the Group maker."
                    : participationMode === "whole_class"
                      ? "Class document will appear when the round starts."
                      : "Students appear when they enter the document."
                  : participationMode === "whole_class"
                    ? "One shared document for the class"
                    : `${visibleRoster.length} ${participationMode === "group" ? "group" : "document"}${visibleRoster.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <ul className="space-y-2">
              {visibleRoster.map((row) => (
                <li
                  key={row.id}
                  className={`rounded-lg px-2 py-1.5 text-sm ${
                    row.orphaned ? "bg-slate-100 opacity-70" : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {(phase === "collected" || phase === "review" || phase === "revision") &&
                      (phase === "revision" ? !row.orphaned : canSelectForReview(row)) && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${row.name}`}
                        />
                      )}
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left font-medium text-slate-900 hover:underline"
                      onClick={() => setInspectId(row.id)}
                    >
                      {row.name}
                      {row.orphaned ? " (orphaned)" : ""}
                    </button>
                    <span className="shrink-0 text-xs font-semibold uppercase text-slate-500">
                      {row.status}
                    </span>
                  </div>
                  {participationMode === "group" && row.memberIds.length > 0 && (
                    <p className="mt-1 pl-6 text-[11px] text-slate-500">
                      Ready {row.readyCount}/{row.memberIds.length} ·{" "}
                      {row.memberIds
                        .map((id) => participants[id]?.name ?? id.slice(0, 6))
                        .join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {(phase === "collected" || phase === "review") && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Class review
                </p>
                <button
                  type="button"
                  disabled={
                    Boolean(busy) ||
                    (participationMode === "whole_class"
                      ? visibleRoster.length === 0
                      : selectedIds.length !== 1)
                  }
                  onClick={() => {
                    const documentId =
                      participationMode === "whole_class"
                        ? (visibleRoster[0]?.id ?? selectedIds[0])
                        : selectedIds[0];
                    if (!documentId) return;
                    void runTeacher({
                      type: "SHOW",
                      documentId,
                      anonymous: false,
                      taskType: "notice",
                    });
                  }}
                  className="w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "SHOW"
                    ? "Showing…"
                    : participationMode === "whole_class"
                      ? `${teacherControlLabel("SHOW")} class document`
                      : participationMode === "group"
                        ? `${teacherControlLabel("SHOW")} group`
                        : `${teacherControlLabel("SHOW")} selected`}
                </button>
                {participationMode !== "whole_class" && (
                  <button
                    type="button"
                    disabled={Boolean(busy) || selectedIds.length !== 2}
                    onClick={() =>
                      void runTeacher({
                        type: "COMPARE",
                        documentIds: [selectedIds[0], selectedIds[1]] as [string, string],
                        anonymous: true,
                        taskType: "choose_stronger",
                        prompt:
                          participationMode === "group"
                            ? "Which group answer is stronger for this task?"
                            : "Which answer is stronger for this task?",
                      })
                    }
                    className="w-full rounded-lg bg-sky-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy === "COMPARE"
                      ? "Comparing…"
                      : participationMode === "group"
                        ? `${teacherControlLabel("COMPARE")} two groups`
                        : `${teacherControlLabel("COMPARE")} two`}
                  </button>
                )}
                <p className="text-[11px] text-slate-500">
                  {participationMode === "whole_class"
                    ? "Select the class document for Show. Compare is not used in whole-class mode."
                    : participationMode === "group"
                      ? "Select 1 group for Show, or exactly 2 groups for Compare (anonymous A/B)."
                      : "Select 1 for Show, or exactly 2 for Compare (anonymous A/B)."}
                </p>
              </div>
            )}

            {(phase === "collected" || phase === "review" || phase === "revision") && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Return note
                  <textarea
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-900"
                  />
                </label>
                <button
                  type="button"
                  disabled={Boolean(busy) || selectedIds.length === 0}
                  onClick={() =>
                    void runTeacher({
                      type: "RETURN",
                      documentIds: selectedIds,
                      note: returnNote,
                    })
                  }
                  className="w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "RETURN" ? "Returning…" : `${teacherControlLabel("RETURN")} selected`}
                </button>
              </div>
            )}
          </aside>
        )}

        {role === "player" && (
          <aside className="hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:block">
            <p className="text-sm font-semibold text-slate-800">{displayName}</p>
            {myGroup ? (
              <p className="mt-1 text-xs text-slate-500">
                {myGroup.name}
                {myReady ? " · Ready" : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                {participationMode === "whole_class" ? "Whole class" : "Individual"}
              </p>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
