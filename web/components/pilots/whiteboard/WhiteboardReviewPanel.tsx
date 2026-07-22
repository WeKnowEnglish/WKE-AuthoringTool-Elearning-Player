"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useState } from "react";
import { WhiteboardCanvas } from "@/components/pilots/whiteboard/WhiteboardCanvas";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import type { WhiteboardAuthRole } from "@/lib/whiteboard/domain";
import {
  REVIEW_TASK_PRESETS,
  readReviewFromRuntime,
  reviewResponseCounts,
  type ReviewTaskKind,
  type ReviewTaskState,
} from "@/lib/whiteboard/review-task";

type Props = {
  sessionId: string;
  role: WhiteboardAuthRole;
  userId: string;
  busy: boolean;
  onTeacherCommand: (label: string, command: Record<string, unknown>) => Promise<void>;
};

function readReviewTask(root: unknown): ReviewTaskState | null {
  const runtime = (root as { runtime?: unknown }).runtime;
  if (!runtime) return null;
  return readReviewFromRuntime({
    get: (key) => {
      if (typeof (runtime as { get?: unknown }).get === "function") {
        return (runtime as { get: (k: string) => unknown }).get(key);
      }
      return (runtime as Record<string, unknown>)[key];
    },
    set: () => undefined,
  });
}

export function WhiteboardReviewPanel({
  sessionId,
  role,
  userId,
  busy,
  onTeacherCommand,
}: Props) {
  const reviewTask = useStorage((root) => readReviewTask(root));
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!reviewTask || reviewTask.boardIds.length === 0) return null;

  const mine = reviewTask.responsesByStudentId[userId];
  const counts = reviewResponseCounts(reviewTask);
  const kindsForMode = (Object.keys(REVIEW_TASK_PRESETS) as ReviewTaskKind[]).filter(
    (k) => REVIEW_TASK_PRESETS[k].modes.includes(reviewTask.mode),
  );
  const showResults = role === "host" || reviewTask.status === "results";

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/whiteboard/${sessionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, note }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not submit.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`border-b px-4 py-3 ${
        reviewTask.mode === "compare"
          ? "border-sky-200 bg-sky-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Class review · {reviewTask.mode === "compare" ? "Compare" : "Show"}
              {reviewTask.anonymous ? " · anonymous" : ""}
            </p>
            <p className="text-lg font-bold text-slate-900">{reviewTask.prompt}</p>
          </div>
          {role === "host" && (
            <div className="flex flex-wrap gap-2">
              {reviewTask.status !== "results" && (
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() =>
                    void onTeacherCommand(teacherControlLabel("REVEAL_RESULTS"), {
                      type: "REVEAL_RESULTS",
                    })
                  }
                >
                  Reveal results
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                className="text-sm font-semibold text-slate-800 underline disabled:opacity-50"
                onClick={() =>
                  void onTeacherCommand(
                    reviewTask.mode === "compare" ? "Close compare" : "Close show",
                    {
                      type: reviewTask.mode === "compare" ? "CLEAR_COMPARE" : "CLEAR_SHOW",
                    },
                  )
                }
              >
                {reviewTask.mode === "compare" ? "Close compare" : "Close show"}
              </button>
            </div>
          )}
        </div>

        <div
          className={`grid gap-3 ${
            reviewTask.boardIds.length > 1
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {reviewTask.boardIds.map((id, index) => (
            <div key={id} className="flex flex-col gap-1">
              <p className="text-xs font-bold text-slate-700">
                {reviewTask.anonymous
                  ? `Board ${String.fromCharCode(65 + index)}`
                  : id.replace(/^board:(student|group):/, "")}
              </p>
              <div
                className={`min-h-[160px] rounded-xl border border-slate-200 bg-white p-1 ${
                  reviewTask.boardIds.length > 2 ? "h-[26vh]" : "h-[36vh]"
                }`}
              >
                <WhiteboardCanvas
                  boardId={id}
                  mode="inspect"
                  sessionId={sessionId}
                  role={role}
                  userId={userId}
                  showPrompt={false}
                />
              </div>
            </div>
          ))}
        </div>

        {role === "host" && (
          <div className="space-y-2 rounded-lg border border-white/80 bg-white/70 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Review task ({counts.total} responses)
              {reviewTask.status === "results" ? " · revealed" : " · hidden from students"}
            </p>
            <div className="flex flex-wrap gap-2">
              {kindsForMode.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  disabled={busy}
                  className={`rounded px-2 py-1 text-xs font-bold ${
                    reviewTask.taskKind === kind
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                  onClick={() =>
                    void onTeacherCommand("Review task", {
                      type: "SET_REVIEW_TASK",
                      taskKind: kind,
                    })
                  }
                >
                  {REVIEW_TASK_PRESETS[kind].label}
                </button>
              ))}
            </div>
            {showResults && counts.total > 0 && (
              <ul className="text-xs text-slate-600">
                {Object.entries(counts.byChoice).map(([key, n]) => (
                  <li key={key}>
                    {key === "_note"
                      ? "Written responses"
                      : reviewTask.anonymous && reviewTask.boardIds.includes(key)
                        ? `Board ${String.fromCharCode(65 + reviewTask.boardIds.indexOf(key))}`
                        : key}
                    : {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {role === "player" && (
          <div className="rounded-lg border border-teal-200 bg-white p-3 shadow-sm">
            {mine ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-teal-800">
                  Response saved
                  {mine.choice
                    ? ` · ${
                        reviewTask.anonymous && reviewTask.boardIds.includes(mine.choice)
                          ? `Board ${String.fromCharCode(65 + reviewTask.boardIds.indexOf(mine.choice))}`
                          : mine.choice
                      }`
                    : ""}
                  {mine.note ? ` · “${mine.note}”` : ""}
                </p>
                {showResults && counts.total > 0 && (
                  <ul className="text-xs text-slate-600">
                    {Object.entries(counts.byChoice).map(([key, n]) => (
                      <li key={key}>
                        {key === "_note"
                          ? "Written responses"
                          : reviewTask.anonymous && reviewTask.boardIds.includes(key)
                            ? `Board ${String.fromCharCode(65 + reviewTask.boardIds.indexOf(key))}`
                            : key}
                        : {n}
                      </li>
                    ))}
                  </ul>
                )}
                {!showResults && (
                  <p className="text-xs text-slate-500">
                    Class results appear when the teacher reveals them.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Your review task</p>
                {reviewTask.taskKind === "agree" && (
                  <div className="flex gap-2">
                    {(["agree", "disagree"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`rounded-lg px-3 py-2 text-sm font-bold capitalize ${
                          choice === opt ? "bg-teal-800 text-white" : "bg-slate-100"
                        }`}
                        onClick={() => setChoice(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {(reviewTask.taskKind === "vote_board" ||
                  reviewTask.taskKind === "strongest") && (
                  <div className="flex flex-wrap gap-2">
                    {reviewTask.boardIds.map((id, index) => (
                      <button
                        key={id}
                        type="button"
                        className={`rounded-lg px-3 py-2 text-sm font-bold ${
                          choice === id ? "bg-teal-800 text-white" : "bg-slate-100"
                        }`}
                        onClick={() => setChoice(id)}
                      >
                        {reviewTask.anonymous
                          ? `Board ${String.fromCharCode(65 + index)}`
                          : `Board ${index + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                {(reviewTask.taskKind === "notice" ||
                  reviewTask.taskKind === "suggest_improve" ||
                  reviewTask.taskKind === "find_difference" ||
                  reviewTask.taskKind === "agree") && (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={280}
                    placeholder="Write a short response…"
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                )}
                <button
                  type="button"
                  disabled={submitting}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void submit()}
                >
                  {submitting ? "Saving…" : "Submit response"}
                </button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
