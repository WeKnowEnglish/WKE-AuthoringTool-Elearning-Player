"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveSpeakingReportAction,
  discardSpeakingReportAction,
  generateSpeakingReportAction,
  loadSpeakingReportsAction,
  saveSpeakingReportAction,
} from "@/lib/actions/speaking-reports";
import type {
  SpeakingReport,
  SpeakingReportSnapshot,
} from "@/lib/speaking-reports/types";
import { speakingReportStatusLabel } from "@/lib/speaking-reports/types";

type Props = {
  sessionId: string;
  /** When true, teacher can generate (transcript exists). */
  transcriptReady: boolean;
};

export function TeacherSpeakingReportPanel({ sessionId, transcriptReady }: Props) {
  const [working, setWorking] = useState<SpeakingReport | null>(null);
  const [approved, setApproved] = useState<SpeakingReport | null>(null);
  const [snapshot, setSnapshot] = useState<SpeakingReportSnapshot | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadSpeakingReportsAction(sessionId);
    if (!result.ok || !result.data) {
      setError(result.ok ? "Could not load reports." : result.error);
      setWorking(null);
      setApproved(null);
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setWorking(result.data.working);
    setApproved(result.data.approved);
    setSnapshot(result.data.working?.snapshot ?? result.data.approved?.snapshot ?? null);
    setDirty(false);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function updateSnapshot(
    updater: (current: SpeakingReportSnapshot) => SpeakingReportSnapshot,
  ) {
    setSnapshot((current) => (current ? updater(current) : current));
    setDirty(true);
    setMessage(null);
  }

  async function run(
    key: string,
    action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>,
  ) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const editable =
    working &&
    (working.status === "draft" || working.status === "ready_for_review") &&
    snapshot;

  return (
    <section className="rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Speaking report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Procedural draft from the transcript. Edit, then approve for this session
            (teacher-only).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy) || !transcriptReady}
            onClick={() =>
              void run("generate", () =>
                generateSpeakingReportAction({ sessionId, force: true }),
              )
            }
            className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy === "generate"
              ? "Generating…"
              : working
                ? "Regenerate draft"
                : "Generate draft"}
          </button>
        </div>
      </div>

      {loading ? <p className="mt-3 text-sm text-slate-600">Loading report…</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}

      {!transcriptReady && !working && !approved ? (
        <p className="mt-3 text-sm text-slate-600">
          Finish and stop transcription first so a ready transcript exists.
        </p>
      ) : null}

      {working ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-800">
          Working · {speakingReportStatusLabel(working.status)} ·{" "}
          {working.generationMethod === "llm" ? "AI draft" : "Heuristic draft"}
        </p>
      ) : null}
      {approved && !working ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Approved · {new Date(approved.approvedAt ?? approved.updatedAt).toLocaleString()}
        </p>
      ) : null}

      {snapshot ? (
        <div className="mt-4 space-y-4">
          <Field
            label="Class summary"
            value={snapshot.classSummary}
            editable={Boolean(editable)}
            multiline
            onChange={(value) =>
              updateSnapshot((current) => ({ ...current, classSummary: value }))
            }
          />

          <div>
            <p className="text-sm font-bold text-slate-900">Key moments</p>
            <ul className="mt-2 space-y-2">
              {snapshot.keyMoments.map((moment, index) => (
                <li
                  key={`${moment.title}-${index}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <Field
                    label="Title"
                    value={moment.title}
                    editable={Boolean(editable)}
                    onChange={(value) =>
                      updateSnapshot((current) => {
                        const keyMoments = [...current.keyMoments];
                        keyMoments[index] = { ...keyMoments[index]!, title: value };
                        return { ...current, keyMoments };
                      })
                    }
                  />
                  <div className="mt-2">
                    <Field
                      label="Detail"
                      value={moment.detail}
                      editable={Boolean(editable)}
                      multiline
                      onChange={(value) =>
                        updateSnapshot((current) => {
                          const keyMoments = [...current.keyMoments];
                          keyMoments[index] = { ...keyMoments[index]!, detail: value };
                          return { ...current, keyMoments };
                        })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">Student speaking notes</p>
            <ul className="mt-2 space-y-3">
              {snapshot.studentNotes.map((note, index) => (
                <li
                  key={`${note.displayName}-${index}`}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{note.displayName}</p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {note.participation.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Field
                      label="Note"
                      value={note.note}
                      editable={Boolean(editable)}
                      multiline
                      onChange={(value) =>
                        updateSnapshot((current) => {
                          const studentNotes = [...current.studentNotes];
                          studentNotes[index] = { ...studentNotes[index]!, note: value };
                          return { ...current, studentNotes };
                        })
                      }
                    />
                  </div>
                  {note.evidenceQuotes.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs italic text-slate-600">
                      {note.evidenceQuotes.map((quote) => (
                        <li key={quote}>“{quote}”</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              {snapshot.studentNotes.length === 0 ? (
                <p className="text-sm text-slate-600">No roster notes for this session.</p>
              ) : null}
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">Follow-ups</p>
            <ul className="mt-2 space-y-2">
              {snapshot.followUps.map((item, index) => (
                <li key={`${index}-${item.slice(0, 12)}`}>
                  <Field
                    label={`Item ${index + 1}`}
                    value={item}
                    editable={Boolean(editable)}
                    multiline
                    onChange={(value) =>
                      updateSnapshot((current) => {
                        const followUps = [...current.followUps];
                        followUps[index] = value;
                        return { ...current, followUps };
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">{snapshot.teacherCaveat}</p>

          {editable ? (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={Boolean(busy) || !dirty}
                onClick={() =>
                  void run("save", () =>
                    saveSpeakingReportAction({
                      sessionId,
                      reportId: working!.id,
                      snapshot: snapshot!,
                    }),
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === "save" ? "Saving…" : "Save edits"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() =>
                  void run("approve", () =>
                    approveSpeakingReportAction({
                      sessionId,
                      reportId: working!.id,
                    }),
                  )
                }
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy === "approve" ? "Approving…" : "Approve report"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  if (!window.confirm("Discard this draft?")) return;
                  void run("discard", () =>
                    discardSpeakingReportAction({
                      sessionId,
                      reportId: working!.id,
                    }),
                  );
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                Discard
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  editable,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  editable: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  if (!editable) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{value}</p>
      </div>
    );
  }
  if (multiline) {
    return (
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </label>
    );
  }
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      />
    </label>
  );
}
