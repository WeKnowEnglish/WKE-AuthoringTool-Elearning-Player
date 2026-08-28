"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, Link2 } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  isDefinitionMatchMastered,
  scoreDefinitionMatchPlayable,
  type DefinitionMatchPlayable,
} from "@/lib/definition-match";
import { useSyncedAnswerMap } from "@/lib/homework-collections/use-synced-answer-map";

type Stage = "overview" | "activity" | "review";

type Props = {
  activity: DefinitionMatchPlayable;
  eyebrow?: string;
  onMastered?: () => void;
  answers?: Record<string, string>;
  onAnswersChange?: (answers: Record<string, string>) => void;
  embedInHomeworkCollection?: boolean;
};

function shuffleIds(ids: string[]): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function DefinitionMatchPlayer({
  activity,
  eyebrow = "Definition match",
  onMastered,
  answers: controlledAnswers,
  onAnswersChange,
  embedInHomeworkCollection = false,
}: Props) {
  const [answers, setAnswers] = useSyncedAnswerMap(controlledAnswers, onAnswersChange);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>(
    embedInHomeworkCollection ? "activity" : "overview",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [wordOrder] = useState(() => {
    const ids = activity.pairs.map((pair) => pair.id);
    return activity.shuffleWords ? shuffleIds(ids) : ids;
  });

  const pairById = useMemo(
    () => Object.fromEntries(activity.pairs.map((pair) => [pair.id, pair])),
    [activity.pairs],
  );
  const usedWordIds = new Set(Object.values(answers));
  const score = scoreDefinitionMatchPlayable(activity, answers);
  const complete = activity.pairs.every((pair) => Boolean(answers[pair.id]));
  const mastered = checked && isDefinitionMatchMastered(score);

  const placeOnDefinition = (definitionId: string) => {
    setChecked(false);
    if (!selectedWordId) {
      if (answers[definitionId]) {
        setAnswers((current) => {
          const next = { ...current };
          delete next[definitionId];
          return next;
        });
        setMessage("Word returned to the bank.");
        return;
      }
      setMessage("Choose a word first.");
      return;
    }
    setAnswers((current) => {
      const next = { ...current };
      for (const [slot, wordId] of Object.entries(next)) {
        if (wordId === selectedWordId) delete next[slot];
      }
      next[definitionId] = selectedWordId;
      return next;
    });
    setSelectedWordId(null);
    setMessage(null);
  };

  if (stage === "overview") {
    return (
      <KidPanel className="bg-white">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-900">
              {eyebrow}
            </span>
            <h2 className="mt-4 text-3xl font-black text-kid-ink">{activity.title}</h2>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-kid-ink/75">
              {activity.instructions}
            </p>
            <ul className="mt-5 space-y-2 text-sm font-bold text-kid-ink/70">
              <li>
                ✓ {activity.pairs.length} word
                {activity.pairs.length === 1 ? "" : "s"} to match
              </li>
              <li>✓ Tap a word, then tap its meaning</li>
            </ul>
            <KidButton className="mt-6" onClick={() => setStage("activity")}>
              Start
            </KidButton>
          </div>
          <div className="rounded-3xl bg-sky-100 p-7 text-center">
            <Link2 className="mx-auto h-24 w-24 text-[#2878b5]" />
            <p className="mt-3 text-lg font-black text-[#17375e]">
              Match each word
              <br />
              to its meaning.
            </p>
          </div>
        </div>
      </KidPanel>
    );
  }

  if (stage === "review") {
    return (
      <KidPanel className="bg-white text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
            mastered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          <BookOpenCheck className="h-14 w-14" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
          Results
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">
          {mastered ? "Perfect matching!" : "Keep practising"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-kid-ink/70">
          You matched {score.correct} of {score.total} correctly.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("activity");
              setChecked(false);
              setAnswers({});
              setSelectedWordId(null);
              setMessage(null);
            }}
          >
            Try again
          </KidButton>
          {mastered && onMastered ? (
            <KidButton onClick={onMastered}>Done</KidButton>
          ) : null}
        </div>
      </KidPanel>
    );
  }

  return (
    <div className="space-y-4">
      <KidPanel className="bg-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
        <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
      </KidPanel>

      <KidPanel className="bg-white">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
          Word bank
        </p>
        <div className="flex flex-wrap gap-2">
          {wordOrder.map((wordId) => {
            const pair = pairById[wordId];
            if (!pair) return null;
            const used = usedWordIds.has(wordId);
            return (
              <button
                key={wordId}
                type="button"
                disabled={used}
                onClick={() => {
                  setSelectedWordId(wordId);
                  setChecked(false);
                  setMessage(null);
                }}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition ${
                  selectedWordId === wordId
                    ? "border-[#241d4f] bg-amber-300 text-[#241d4f]"
                    : "border-indigo-200 bg-indigo-50 text-indigo-950"
                } disabled:opacity-35`}
              >
                {pair.word}
              </button>
            );
          })}
        </div>
      </KidPanel>

      <div className="space-y-2">
        {activity.pairs.map((pair, index) => {
          const placedId = answers[pair.id];
          const placed = placedId ? pairById[placedId] : null;
          const correct = checked && placedId === pair.id;
          const wrong = checked && placedId && placedId !== pair.id;
          return (
            <button
              key={pair.id}
              type="button"
              onClick={() => placeOnDefinition(pair.id)}
              className={`grid w-full grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-2xl border-4 bg-white p-4 text-left shadow-[4px_4px_0_0_#c7d2fe] ${
                correct
                  ? "border-emerald-500"
                  : wrong
                    ? "border-amber-400"
                    : "border-[#312e81]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-800">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-bold leading-5 text-slate-800">
                  {pair.definition}
                </span>
                <span className="mt-1 block text-xs font-black text-indigo-700">
                  {placed?.word || "Tap to place a word"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {message ? (
        <p className="text-center text-sm font-bold text-amber-800">{message}</p>
      ) : null}

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <p className="text-sm font-semibold text-kid-ink/70">
          {Object.keys(answers).length}/{activity.pairs.length} placed
          {checked ? ` · ${score.correct} correct` : ""}
        </p>
        <KidButton
          disabled={!complete}
          onClick={() => {
            setChecked(true);
            setStage("review");
          }}
        >
          Check my answers
        </KidButton>
      </KidPanel>
    </div>
  );
}
