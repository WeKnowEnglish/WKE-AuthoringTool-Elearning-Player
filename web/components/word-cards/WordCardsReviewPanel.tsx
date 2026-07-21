"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useState } from "react";
import { WordCardsCardEditor } from "@/components/word-cards/WordCardsCardEditor";
import {
  REVIEW_TASK_PRESETS,
  WORD_CARDS_COMPARE_TASKS,
  WORD_CARDS_SHOW_TASKS,
  reviewResponseCounts,
  wordCardsReviewLabel,
  type WordCardsReviewState,
  type WordCardsReviewTaskType,
} from "@/lib/word-cards/review";

type Props = {
  joinCode: string;
  role: "host" | "player";
  userId: string;
  phase: string;
  busy: boolean;
  onTeacherCommand: (command: Record<string, unknown>) => Promise<void>;
};

function readReview(root: unknown): WordCardsReviewState | null {
  const runtime = (root as { runtime?: { get?: (k: string) => unknown } & Record<string, unknown> })
    .runtime;
  if (!runtime) return null;
  if (typeof runtime.get === "function") {
    return (runtime.get("review") as WordCardsReviewState | null) ?? null;
  }
  return ((runtime as Record<string, unknown>).review as WordCardsReviewState | null) ?? null;
}

function normalizeType(type: string): string {
  if (type === "agree") return "agree_disagree";
  if (type === "vote_board") return "vote";
  if (type === "strongest") return "choose_stronger";
  return type;
}

export function WordCardsReviewPanel({
  joinCode,
  role,
  userId,
  phase,
  busy,
  onTeacherCommand,
}: Props) {
  const review = useStorage((root) => readReview(root));
  const displayNames = useStorage((root) => {
    const cards = (root as { cards?: unknown }).cards;
    const names: Record<string, string> = {};
    if (!cards || typeof cards !== "object") return names;
    if (typeof (cards as { entries?: unknown }).entries === "function") {
      for (const [id, raw] of (
        cards as { entries: () => IterableIterator<[string, unknown]> }
      ).entries()) {
        const card = raw as { get?: (k: string) => unknown; displayName?: string };
        const name =
          typeof card.get === "function"
            ? String(card.get("displayName") ?? "")
            : String(card.displayName ?? "");
        if (name) names[id] = name;
      }
    }
    return names;
  });
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!review || review.targetIds.length === 0) return null;

  const labelFor = (id: string, index: number) =>
    wordCardsReviewLabel(review, id, index, displayNames[id] ?? null);

  const taskType = normalizeType(review.task.type);
  const mine = review.responsesByStudentId[userId];
  const counts = reviewResponseCounts(review);
  const taskOptions =
    review.mode === "compare" ? WORD_CARDS_COMPARE_TASKS : WORD_CARDS_SHOW_TASKS;
  const showResults = role === "host" || review.status === "results";

  const submitReview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/word-cards/${joinCode}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SUBMIT_REVIEW", choice, note }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not submit review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={`rounded-xl border p-4 shadow-sm ${
        review.mode === "compare"
          ? "border-sky-200 bg-sky-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Class review · {review.mode === "compare" ? "Compare" : "Show"}
            {review.anonymous ? " · anonymous" : ""}
          </p>
          <p className="text-lg font-bold text-slate-900">{review.task.prompt}</p>
        </div>
        {role === "host" && (
          <div className="flex flex-wrap gap-2">
            {review.status !== "results" && (
              <button
                type="button"
                disabled={busy}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                onClick={() => void onTeacherCommand({ type: "REVEAL_RESULTS" })}
              >
                Reveal results
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              className="text-sm font-semibold text-slate-800 underline disabled:opacity-50"
              onClick={() =>
                void onTeacherCommand({
                  type: review.mode === "compare" ? "CLEAR_COMPARE" : "CLEAR_SHOW",
                })
              }
            >
              {review.mode === "compare" ? "Close compare" : "Close show"}
            </button>
          </div>
        )}
      </div>

      <div
        className={`mt-3 grid gap-3 ${
          review.targetIds.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"
        }`}
      >
        {review.targetIds.map((id, index) => (
          <div
            key={id}
            className="rounded-lg border border-white/80 bg-white p-3 shadow-sm"
          >
            <p className="mb-2 text-xs font-bold text-slate-700">{labelFor(id, index)}</p>
            <WordCardsCardEditor
              cardId={id}
              joinCode={joinCode}
              role={role}
              userId={userId}
              phase={phase}
              readOnly
            />
          </div>
        ))}
      </div>

      {role === "host" && (
        <div className="mt-3 space-y-2 rounded-lg border border-white/80 bg-white/80 p-3">
          <p className="text-xs font-semibold text-slate-700">
            Review task ({counts.total} responses)
            {review.status === "results" ? " · revealed" : " · hidden from students"}
          </p>
          <div className="flex flex-wrap gap-2">
            {taskOptions.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={busy}
                className={`rounded px-2 py-1 text-xs font-bold ${
                  taskType === kind ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                }`}
                onClick={() =>
                  void onTeacherCommand({
                    type: "SET_REVIEW_TASK",
                    taskType: kind as WordCardsReviewTaskType,
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
                    : review.targetIds.includes(key)
                      ? labelFor(key, review.targetIds.indexOf(key))
                      : key}
                  : {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {role === "player" && (
        <div className="mt-3 rounded-lg border border-teal-200 bg-white p-3 shadow-sm">
          {mine ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-teal-800">
                Response saved
                {mine.choice
                  ? ` · ${
                      review.targetIds.includes(mine.choice)
                        ? labelFor(mine.choice, review.targetIds.indexOf(mine.choice))
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
                        : review.targetIds.includes(key)
                          ? labelFor(key, review.targetIds.indexOf(key))
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
              {taskType === "agree_disagree" && (
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
              {(taskType === "vote" || taskType === "choose_stronger") && (
                <div className="flex flex-wrap gap-2">
                  {review.targetIds.map((id, index) => (
                    <button
                      key={id}
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${
                        choice === id ? "bg-teal-800 text-white" : "bg-slate-100"
                      }`}
                      onClick={() => setChoice(id)}
                    >
                      {labelFor(id, index)}
                    </button>
                  ))}
                </div>
              )}
              {(taskType === "notice" ||
                taskType === "suggest_improve" ||
                taskType === "find_difference" ||
                taskType === "short_response" ||
                taskType === "agree_disagree") && (
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
                onClick={() => void submitReview()}
              >
                {submitting ? "Saving…" : "Submit response"}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
