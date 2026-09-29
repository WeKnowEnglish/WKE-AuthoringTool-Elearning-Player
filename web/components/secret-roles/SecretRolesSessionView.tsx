"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SECRET_ROLE_PHASES,
  canTransitionSecretRolePhase,
  type SecretRolePhase,
  type SecretRoleStudentView,
} from "@/lib/secret-roles/domain";

type HostPayload = {
  round: SecretRoleStudentView["round"] & { sessionId: string };
  cards: SecretRoleStudentView["assignment"]["role"][];
  assignments: Array<{ studentId: string; displayName: string; cardId: string; readyAt: string | null }>;
  responses: Array<{ studentId: string; answer: string; reasoning: string; submittedAt: string }>;
};

type LiveStudent = { id: string; displayName: string };
type Props = { roundId: string; role: "host" | "member"; liveStudents?: LiveStudent[] };

export function SecretRolesSessionView({ roundId, role, liveStudents = [] }: Props) {
  const [payload, setPayload] = useState<HostPayload | SecretRoleStudentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const endpoint = role === "host" ? `/api/secret-roles/${roundId}/host` : `/api/secret-roles/${roundId}/me`;
    try {
      const response = await fetch(endpoint, { credentials: "include", cache: "no-store" });
      const next = (await response.json()) as (HostPayload | SecretRoleStudentView) & { error?: string };
      if (!response.ok) throw new Error(next.error ?? "Could not load Secret Roles.");
      setPayload(next);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Secret Roles.");
    }
  }, [role, roundId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!payload) {
    return (
      <div className="flex h-full min-h-[18rem] items-center justify-center rounded-xl border border-violet-200 bg-violet-50 p-6 text-center">
        <p className="text-sm font-bold text-violet-950">{error ?? "Opening private roles…"}</p>
      </div>
    );
  }
  return role === "host" ? (
    <SecretRolesHostView
      payload={payload as HostPayload}
      busy={busy}
      error={error}
      lateStudents={liveStudents.filter(
        (student) => !(payload as HostPayload).assignments.some((assignment) => assignment.studentId === student.id),
      )}
      onAssignLate={async (student) => {
        setBusy(true);
        setError(null);
        try {
          const response = await fetch(`/api/secret-roles/${roundId}/commands`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "ASSIGN_LATE_JOINER", student }),
          });
          const next = (await response.json()) as HostPayload & { error?: string };
          if (!response.ok) throw new Error(next.error ?? "Could not assign the late joiner.");
          setPayload(next);
        } catch (assignError) {
          setError(assignError instanceof Error ? assignError.message : "Could not assign the late joiner.");
        } finally {
          setBusy(false);
        }
      }}
      onPhase={async (phase) => {
        setBusy(true);
        setError(null);
        try {
          const response = await fetch(`/api/secret-roles/${roundId}/commands`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "SET_PHASE", phase }),
          });
          const next = (await response.json()) as HostPayload & { error?: string };
          if (!response.ok) throw new Error(next.error ?? "Could not change phase.");
          setPayload(next);
        } catch (phaseError) {
          setError(phaseError instanceof Error ? phaseError.message : "Could not change phase.");
        } finally {
          setBusy(false);
        }
      }}
    />
  ) : (
    <SecretRolesStudentView roundId={roundId} payload={payload as SecretRoleStudentView} error={error} />
  );
}

function SecretRolesHostView({ payload, busy, error, lateStudents, onAssignLate, onPhase }: { payload: HostPayload; busy: boolean; error: string | null; lateStudents: LiveStudent[]; onAssignLate: (student: LiveStudent) => Promise<void>; onPhase: (phase: SecretRolePhase) => Promise<void> }) {
  const phaseIndex = SECRET_ROLE_PHASES.indexOf(payload.round.phase);
  const readyCount = payload.assignments.filter((assignment) => assignment.readyAt).length;
  const cardById = useMemo(() => new Map(payload.cards.map((card) => [card.id, card])), [payload.cards]);
  const previousCandidate = phaseIndex > 0 ? SECRET_ROLE_PHASES[phaseIndex - 1] : null;
  const previous = previousCandidate && canTransitionSecretRolePhase(payload.round.phase, previousCandidate) ? previousCandidate : null;
  const next = phaseIndex >= 0 && phaseIndex < SECRET_ROLE_PHASES.length - 1 ? SECRET_ROLE_PHASES[phaseIndex + 1] : null;
  return (
    <div className="h-full overflow-y-auto rounded-xl border border-violet-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-violet-100 bg-white/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Teacher view · {payload.round.phase}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{payload.round.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{payload.round.scenario}</p>
          </div>
          <div className="flex gap-2">
            {previous ? <button disabled={busy} onClick={() => void onPhase(previous)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Back</button> : null}
            {next ? <button disabled={busy} onClick={() => void onPhase(next)} className="rounded-lg bg-violet-800 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">{next === "completed" ? "Complete" : `Start ${next}`}</button> : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">Ready {readyCount}/{payload.assignments.length}</span>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">Decisions {payload.responses.length}/{payload.assignments.length}</span>
        </div>
        {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
        {lateStudents.length ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
            <p className="text-xs font-bold text-amber-900">Joined after launch</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {lateStudents.map((student) => (
                <button key={student.id} disabled={busy} onClick={() => void onAssignLate(student)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-300 disabled:opacity-50">
                  Assign {student.displayName}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        {payload.assignments.map((assignment) => {
          const card = cardById.get(assignment.cardId);
          const response = payload.responses.find((item) => item.studentId === assignment.studentId);
          return (
            <article key={assignment.studentId} className="rounded-xl border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold text-slate-950">{assignment.displayName}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${assignment.readyAt ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{assignment.readyAt ? "Ready" : "Reading"}</span>
              </div>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-violet-700">{card?.title ?? "Role unavailable"}</p>
              <p className="mt-1 text-sm text-slate-700">{card?.privateInformation}</p>
              {response ? <div className="mt-3 rounded-lg bg-sky-50 p-2 text-xs text-sky-950"><p className="font-bold">{response.answer}</p><p className="mt-1">{response.reasoning}</p></div> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SecretRolesStudentView({ roundId, payload, error }: { roundId: string; payload: SecretRoleStudentView; error: string | null }) {
  const [ready, setReady] = useState(false);
  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const phase = payload.round.phase;
  return (
    <div className="h-full overflow-y-auto rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-center text-xs font-black uppercase tracking-[0.18em] text-violet-700">{phase}</p>
        <h2 className="mt-1 text-center text-2xl font-black text-slate-950">{payload.round.title}</h2>
        <p className="mt-2 text-center text-sm text-slate-600">{payload.round.scenario}</p>

        <article className="mt-5 rounded-2xl border-2 border-violet-300 bg-white p-5 shadow-lg">
          <p className="text-xs font-black uppercase tracking-wide text-violet-700">Your private role</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{payload.assignment.role.title}</h3>
          <div className="mt-4 rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-amber-800">Only you know</p>
            <p className="mt-1 text-base font-semibold text-amber-950">{payload.assignment.role.privateInformation}</p>
          </div>
          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Your speaking mission</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{payload.assignment.role.mission}</p>
          </div>
          {payload.assignment.role.sentenceFrames.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {payload.assignment.role.sentenceFrames.map((frame) => <span key={frame} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-900">{frame}</span>)}
            </div>
          ) : null}
        </article>

        {phase === "briefing" && !ready ? (
          <button type="button" onClick={() => void fetch(`/api/secret-roles/${roundId}/ready`, { method: "POST", credentials: "include" }).then((response) => { if (!response.ok) throw new Error("Could not mark ready."); setReady(true); }).catch((readyError: unknown) => setActionError(readyError instanceof Error ? readyError.message : "Could not mark ready."))} className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white">I understand my role</button>
        ) : phase === "briefing" ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-800">Ready. Keep your card private.</p> : null}

        {phase === "discussion" ? <p className="mt-4 rounded-xl bg-sky-50 p-3 text-center text-sm font-bold text-sky-900">Speak to classmates. Share ideas in your own words—do not show your card.</p> : null}

        {phase === "decision" ? (
          <div className="mt-5 space-y-3 rounded-xl border border-sky-200 bg-white p-4">
            <p className="font-extrabold text-slate-950">{payload.round.discussionPrompt}</p>
            <TextAnswer label="Your conclusion" value={answer} onChange={setAnswer} />
            <TextAnswer label="One clue that supports it" value={reasoning} onChange={setReasoning} />
            <button disabled={submitted || !answer.trim() || !reasoning.trim()} onClick={() => void fetch(`/api/secret-roles/${roundId}/response`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer, reasoning }) }).then(async (response) => { if (!response.ok) { const body = await response.json() as { error?: string }; throw new Error(body.error ?? "Could not submit."); } setSubmitted(true); }).catch((submitError: unknown) => setActionError(submitError instanceof Error ? submitError.message : "Could not submit."))} className="w-full rounded-lg bg-sky-800 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40">{submitted ? "Decision submitted" : "Submit decision"}</button>
          </div>
        ) : null}
        {phase === "reveal" ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-3">
            <p className="text-center text-sm font-bold text-amber-900">The roles are revealed. How did the clues fit together?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(payload.revealedRoles ?? []).map((role) => (
                <div key={role.id} className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm">
                  <p className="font-extrabold text-slate-950">{role.title}</p>
                  <p className="mt-1">{role.privateInformation}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {phase === "debrief" ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-900">Which clue changed your mind? Tell a partner using “I thought…, but then…”</p> : null}
        {(actionError || error) ? <p role="alert" className="mt-3 text-center text-sm font-semibold text-red-700">{actionError ?? error}</p> : null}
      </div>
    </div>
  );
}

function TextAnswer({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-bold text-slate-700">{label}<textarea rows={2} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950" /></label>;
}
