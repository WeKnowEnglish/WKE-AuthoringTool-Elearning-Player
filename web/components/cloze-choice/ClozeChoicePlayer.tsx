"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  isClozeChoiceMastered,
  listClozeChoiceGaps,
  scoreClozeChoicePlayable,
  type ClozeChoicePlayable,
} from "@/lib/cloze-choice";

type Stage = "overview" | "activity" | "review";

type Props = {
  activity: ClozeChoicePlayable;
  eyebrow?: string;
  onMastered?: () => void;
};

function shuffleOptions(options: string[]): string[] {
  const next = [...options];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function ClozeChoicePlayer({
  activity,
  eyebrow = "Cloze with choices",
  onMastered,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("overview");

  const gaps = useMemo(() => listClozeChoiceGaps(activity.segments), [activity.segments]);
  const [optionOrder] = useState(() => {
    const map: Record<string, string[]> = {};
    for (const gap of listClozeChoiceGaps(activity.segments)) {
      map[gap.id] = activity.shuffleOptions
        ? shuffleOptions(gap.options)
        : [...gap.options];
    }
    return map;
  });

  const score = scoreClozeChoicePlayable(activity, answers);
  const complete = gaps.every((gap) => Boolean(answers[gap.id]));
  const mastered = checked && isClozeChoiceMastered(score);

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
              <li>
                ✓ {gaps.length} gap{gaps.length === 1 ? "" : "s"} in the passage
              </li>
              <li>✓ Choose the best word for each gap</li>
            </ul>
            <KidButton className="mt-6" onClick={() => setStage("activity")}>
              Start
            </KidButton>
          </div>
          <div className="rounded-3xl bg-teal-100 p-7 text-center">
            <BookOpenCheck className="mx-auto h-24 w-24 text-teal-800" />
            <p className="mt-3 text-lg font-black text-[#17375e]">
              Read carefully.
              <br />
              Choose wisely.
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
          {mastered ? "Perfect passage!" : "Keep practising"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-kid-ink/70">
          You completed {score.correct} of {score.total} gaps correctly.
        </p>
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border-2 border-teal-100 bg-teal-50 p-4 text-left">
          <p className="text-xs font-black uppercase tracking-wide text-teal-800">
            Complete passage
          </p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-800">
            {activity.segments
              .map((segment) =>
                segment.type === "text" ? segment.text : segment.correctAnswer,
              )
              .join("")}
          </p>
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
        {activity.passageTitle ? (
          <h3 className="mb-3 text-lg font-black text-kid-ink">{activity.passageTitle}</h3>
        ) : null}
        <p className="text-base font-semibold leading-10 text-slate-800">
          {activity.segments.map((segment) => {
            if (segment.type === "text") {
              return <span key={segment.id}>{segment.text}</span>;
            }
            const selected = answers[segment.id] ?? "";
            const showResult = checked;
            const ok = selected === segment.correctAnswer;
            return (
              <select
                key={segment.id}
                aria-label="Choose a word for this gap"
                value={selected}
                onChange={(event) => {
                  setChecked(false);
                  setAnswers((current) => ({
                    ...current,
                    [segment.id]: event.target.value,
                  }));
                }}
                className={`mx-1 inline-block min-w-28 rounded-lg border-2 px-2 py-1 text-sm font-black ${
                  showResult
                    ? ok
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-amber-500 bg-amber-50"
                    : "border-teal-600 bg-white"
                }`}
              >
                <option value="">Choose…</option>
                {(optionOrder[segment.id] ?? segment.options).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          })}
        </p>
      </KidPanel>

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <p className="text-sm font-semibold text-kid-ink/70">
          {Object.keys(answers).length}/{gaps.length} filled
          {checked ? ` · ${score.correct} correct` : ""}
        </p>
        <KidButton
          disabled={!complete}
          onClick={() => {
            setChecked(true);
            setStage("review");
          }}
        >
          Check my passage
        </KidButton>
      </KidPanel>
    </div>
  );
}
