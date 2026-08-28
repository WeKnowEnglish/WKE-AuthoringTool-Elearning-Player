"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  isReadAndAnswerMastered,
  isReadAndAnswerQuestionCorrect,
  scoreReadAndAnswerPlayable,
  type ReadAndAnswerOption,
  type ReadAndAnswerPlayable,
} from "@/lib/read-and-answer";
import { useSyncedAnswerMap } from "@/lib/homework-collections/use-synced-answer-map";

type Stage = "overview" | "activity" | "review";

type Props = {
  activity: ReadAndAnswerPlayable;
  eyebrow?: string;
  onMastered?: () => void;
  answers?: Record<string, string>;
  onAnswersChange?: (answers: Record<string, string>) => void;
  embedInHomeworkCollection?: boolean;
};

function shuffleOptions(options: ReadAndAnswerOption[]): ReadAndAnswerOption[] {
  const next = [...options];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function ReadAndAnswerPlayer({
  activity,
  eyebrow = "Read and answer",
  onMastered,
  answers: controlledAnswers,
  onAnswersChange,
  embedInHomeworkCollection = false,
}: Props) {
  const [answers, setAnswers] = useSyncedAnswerMap(controlledAnswers, onAnswersChange);
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>(
    embedInHomeworkCollection ? "activity" : "overview",
  );

  const [optionOrder] = useState(() => {
    const map: Record<string, ReadAndAnswerOption[]> = {};
    for (const question of activity.questions) {
      map[question.id] = activity.shuffleOptions
        ? shuffleOptions(question.options)
        : [...question.options];
    }
    return map;
  });

  const score = scoreReadAndAnswerPlayable(activity, answers);
  const complete = activity.questions.every((question) => Boolean(answers[question.id]));
  const mastered = checked && isReadAndAnswerMastered(score);

  const correctOptionText = useMemo(() => {
    const map: Record<string, string> = {};
    for (const question of activity.questions) {
      const option = question.options.find((item) => item.id === question.correctOptionId);
      map[question.id] = option?.text ?? question.correctOptionId;
    }
    return map;
  }, [activity.questions]);

  if (stage === "overview") {
    return (
      <KidPanel className="bg-white">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-900">
              {eyebrow}
            </span>
            <h2 className="mt-4 text-3xl font-black text-kid-ink">{activity.title}</h2>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-kid-ink/75">
              {activity.instructions}
            </p>
            <ul className="mt-5 space-y-2 text-sm font-bold text-kid-ink/70">
              <li>✓ Read the passage carefully</li>
              <li>
                ✓ Answer {activity.questions.length} question
                {activity.questions.length === 1 ? "" : "s"}
              </li>
            </ul>
            <KidButton className="mt-6" onClick={() => setStage("activity")}>
              Start
            </KidButton>
          </div>
          <div className="rounded-3xl bg-teal-100 p-7 text-center">
            <BookOpenCheck className="mx-auto h-24 w-24 text-teal-800" />
            <p className="mt-3 text-lg font-black text-[#17375e]">
              Read first.
              <br />
              Then choose.
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
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-teal-800">
          Results
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">
          {mastered ? "Perfect answers!" : "Keep practising"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-kid-ink/70">
          You got {score.correct} of {score.total} questions correct.
        </p>
        <div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">
          {activity.questions.map((question, index) => {
            const ok = isReadAndAnswerQuestionCorrect(question, answers[question.id]);
            return (
              <div
                key={question.id}
                className={`rounded-2xl border-2 p-4 ${
                  ok
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-wide text-teal-800">
                  Question {index + 1}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">{question.prompt}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Answer: {correctOptionText[question.id]}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("activity");
              setChecked(false);
              setAnswers({});
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
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-800">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
        <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
      </KidPanel>

      <KidPanel className="bg-white">
        {activity.passage.title ? (
          <h3 className="mb-3 text-lg font-black text-kid-ink">{activity.passage.title}</h3>
        ) : null}
        {activity.passage.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activity.passage.imageUrl}
            alt={activity.passage.imageAlt || activity.passage.title || "Passage image"}
            className="mb-4 max-h-64 w-full rounded-2xl object-cover"
          />
        ) : null}
        <p className="whitespace-pre-wrap text-base font-semibold leading-8 text-slate-800">
          {activity.passage.text}
        </p>
      </KidPanel>

      <div className="space-y-3">
        {activity.questions.map((question, index) => {
          const selected = answers[question.id] ?? "";
          const showResult = checked;
          const ok = isReadAndAnswerQuestionCorrect(question, selected);
          return (
            <KidPanel key={question.id} className="bg-white">
              <p className="text-xs font-black uppercase tracking-wide text-teal-800">
                Question {index + 1}
              </p>
              <h3 className="mt-1 text-lg font-black text-kid-ink">{question.prompt}</h3>
              <div className="mt-3 space-y-2">
                {(optionOrder[question.id] ?? question.options).map((option) => {
                  const isSelected = selected === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setChecked(false);
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: option.id,
                        }));
                      }}
                      className={`flex w-full items-center rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition ${
                        showResult && isSelected
                          ? ok
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                            : "border-amber-500 bg-amber-50 text-amber-900"
                          : isSelected
                            ? "border-teal-600 bg-teal-50 text-teal-950"
                            : "border-stone-200 bg-white text-slate-800 hover:border-teal-300"
                      }`}
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </KidPanel>
          );
        })}
      </div>

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <p className="text-sm font-semibold text-kid-ink/70">
          {Object.keys(answers).length}/{activity.questions.length} answered
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
