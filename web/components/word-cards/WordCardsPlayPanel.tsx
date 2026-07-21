"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useMemo, useState } from "react";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import {
  aggregatePlayResults,
  isAnswerCorrect,
  playChoiceDisplayOrder,
  type WordCardsPlayState,
} from "@/lib/word-cards/play";

type Props = {
  joinCode: string;
  role: "host" | "player";
  userId: string;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
  busy: string | null;
};

function readRuntimePlay(root: unknown): WordCardsPlayState | null {
  const runtime = (root as { runtime?: { get?: (k: string) => unknown } & Record<string, unknown> })
    .runtime;
  if (!runtime) return null;
  const play =
    typeof runtime.get === "function"
      ? runtime.get("play")
      : (runtime as Record<string, unknown>).play;
  if (!play || typeof play !== "object") return null;
  return play as WordCardsPlayState;
}

export function WordCardsPlayPanel({ joinCode, role, userId, onCommand, busy }: Props) {
  const play = useStorage((root) => readRuntimePlay(root));
  const [error, setError] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const choices = useMemo(() => {
    if (!play) return [] as string[];
    return playChoiceDisplayOrder({
      choiceWords: play.choiceWords,
      userId,
      promptCardId: play.promptCardId,
      itemIndex: play.itemIndex,
    });
  }, [play, userId]);

  const myAnswer = play?.answersByStudentId[userId]?.selectedWord ?? null;
  const results = play ? aggregatePlayResults(play) : null;
  const answeredCount = play ? Object.keys(play.answersByStudentId).length : 0;

  if (!play) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">Waiting for the race to start…</p>
      </section>
    );
  }

  const selectAnswer = async (word: string) => {
    if (role !== "player" || play.status !== "selecting") return;
    setLocalBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/word-cards/${joinCode}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SELECT_PLAY_ANSWER", selectedWord: word }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not save answer.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save answer.");
    } finally {
      setLocalBusy(false);
    }
  };

  const run = async (command: Record<string, unknown>) => {
    setError(null);
    try {
      await onCommand(command);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command failed.");
    }
  };

  const mineCorrect =
    play.status === "revealed" && myAnswer
      ? isAnswerCorrect(myAnswer, play.correctWord)
      : null;

  return (
    <section className="space-y-4 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">
            Definition race
          </p>
          <p className="text-xs text-slate-500">
            Item {play.itemIndex + 1} · {play.status}
            {role === "host" ? ` · ${answeredCount} answered` : ""}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-indigo-50 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Which word matches this definition?
        </p>
        <p className="mt-2 text-xl font-semibold leading-snug text-slate-900">
          {play.definition}
        </p>
      </div>

      {role === "player" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((word) => {
            const selected = myAnswer?.toLowerCase() === word.toLowerCase();
            const showResult = play.status === "revealed";
            const isCorrectWord =
              word.toLowerCase() === play.correctWord.toLowerCase();
            return (
              <button
                key={word}
                type="button"
                disabled={play.status !== "selecting" || localBusy}
                onClick={() => void selectAnswer(word)}
                className={`rounded-lg border px-3 py-3 text-left text-sm font-bold transition disabled:opacity-70 ${
                  selected
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-900 hover:border-indigo-300"
                } ${
                  showResult && isCorrectWord
                    ? "ring-2 ring-emerald-500"
                    : showResult && selected && !isCorrectWord
                      ? "ring-2 ring-rose-400"
                      : ""
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      )}

      {role === "player" && play.status === "selecting" && (
        <p className="text-xs text-slate-500">
          You can change your answer until the teacher locks.
        </p>
      )}
      {role === "player" && play.status === "locked" && (
        <p className="text-sm text-slate-600">Answers locked. Waiting for results…</p>
      )}
      {role === "player" && play.status === "revealed" && (
        <p
          className={`text-sm font-semibold ${
            mineCorrect ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {mineCorrect
            ? "Correct!"
            : myAnswer
              ? `Not quite — the word was “${play.correctWord}”.`
              : `No answer — the word was “${play.correctWord}”.`}
          {results ? ` Class: ${results.correct} correct.` : null}
        </p>
      )}

      {role === "host" && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-600">
            Correct word:{" "}
            <span className="font-semibold text-slate-900">{play.correctWord}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {play.status === "selecting" && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run({ type: "LOCK_PLAY_ANSWERS" })}
                className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy === "LOCK_PLAY_ANSWERS"
                  ? "Locking…"
                  : teacherControlLabel("LOCK_PLAY_ANSWERS")}
              </button>
            )}
            {play.status === "locked" && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run({ type: "REVEAL_PLAY_RESULTS" })}
                className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy === "REVEAL_PLAY_RESULTS"
                  ? "Revealing…"
                  : teacherControlLabel("REVEAL_PLAY_RESULTS")}
              </button>
            )}
            {(play.status === "revealed" || play.status === "selecting") && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run({ type: "NEXT_PLAY_ITEM" })}
                className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy === "NEXT_PLAY_ITEM" ? "Next…" : teacherControlLabel("NEXT_PLAY_ITEM")}
              </button>
            )}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void run({ type: "END_PLAY" })}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy === "END_PLAY" ? "Ending…" : teacherControlLabel("END_PLAY")}
            </button>
          </div>

          {play.status === "revealed" && results && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Class results (anonymous)</p>
              <p className="mt-1">
                {results.correct} correct · {results.incorrect} incorrect
                {results.blank ? ` · ${results.blank} blank` : ""}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                {Object.entries(results.countsByWord)
                  .sort((a, b) => b[1] - a[1])
                  .map(([word, count]) => (
                    <li key={word}>
                      {word}: {count}
                      {word.toLowerCase() === play.correctWord.toLowerCase() ? " ✓" : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
