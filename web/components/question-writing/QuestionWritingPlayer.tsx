"use client";

import { useMemo, useState } from "react";
import { CircleCheck, CircleDashed, HelpCircle, Send } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  checkQuestionWritingResponse,
  isQuestionWritingPromptReady,
  type QuestionWritingCheck,
  type QuestionWritingPlayable,
} from "@/lib/question-writing";

type Stage = "activity" | "review";

type Props = {
  activity: QuestionWritingPlayable;
  eyebrow?: string;
  doneLabel?: string;
  onReady?: (snapshot: { answers: Record<string, string>; correct: null; total: number }) => void;
};

export function QuestionWritingPlayer({
  activity,
  eyebrow = "Question writing",
  doneLabel = "Done",
  onReady,
}: Props) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("activity");

  const checks = useMemo(
    () =>
      Object.fromEntries(
        activity.prompts.map((prompt) => [
          prompt.id,
          checkQuestionWritingResponse(responses[prompt.id] ?? "", prompt),
        ]),
      ) as Record<string, QuestionWritingCheck>,
    [activity.prompts, responses],
  );
  const allReady =
    checked &&
    activity.prompts.every((prompt) => isQuestionWritingPromptReady(checks[prompt.id]!));

  if (stage === "review") {
    return (
      <KidPanel className="bg-white text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Send className="h-14 w-14" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
          Review
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">
          Questions ready for teacher review
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg font-bold text-kid-ink/70">
          All {activity.prompts.length} responses meet the basic question checks. Your
          teacher can now review whether each question is natural and complete.
        </p>
        <div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">
          {activity.prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Question {index + 1}
              </p>
              <p className="mt-1 font-semibold leading-7 text-slate-800">
                {responses[prompt.id]}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                Teacher review pending
              </span>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("activity");
              setChecked(false);
            }}
          >
            Edit my questions
          </KidButton>
          {onReady ? (
            <KidButton onClick={() => onReady({ answers: responses, correct: null, total: activity.prompts.length })}>{doneLabel}</KidButton>
          ) : null}
        </div>
      </KidPanel>
    );
  }

  return (
    <div className="space-y-4">
      <KidPanel className="bg-white">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-800">
            <HelpCircle className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
            <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
            Example
          </p>
          <p className="mt-2 font-bold text-slate-600">{activity.workedExample.prompt}</p>
          <p className="mt-1 text-lg font-black text-indigo-950">
            {activity.workedExample.question}
          </p>
          <p className="mt-1 font-semibold text-slate-700">
            {activity.workedExample.answer}
          </p>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          The helper checks question structure. Your teacher checks whether each question
          is natural and grammatically complete.
        </p>
      </KidPanel>

      {activity.prompts.map((prompt, index) => {
        const result = checks[prompt.id]!;
        const ready = isQuestionWritingPromptReady(result);
        return (
          <article
            key={prompt.id}
            className={`rounded-2xl border-4 bg-white p-5 shadow-[4px_4px_0_0_#c7d2fe] ${
              checked
                ? ready
                  ? "border-emerald-500"
                  : "border-amber-400"
                : "border-[#312e81]"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
              Question {index + 1}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {prompt.promptWords.map((word, wordIndex) => (
                <span
                  key={`${word}-${wordIndex}`}
                  className="rounded-lg bg-indigo-100 px-3 py-2 text-base font-black text-indigo-950"
                >
                  {word}
                </span>
              ))}
            </div>
            <label className="mt-4 block text-sm font-black text-slate-700">
              Write the complete question
              <input
                value={responses[prompt.id] ?? ""}
                onChange={(event) => {
                  setResponses((current) => ({
                    ...current,
                    [prompt.id]: event.target.value,
                  }));
                  setChecked(false);
                }}
                className="mt-2 w-full rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3 text-base font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {result.wordCount} words · start with “{prompt.questionWord}”
            </p>
            {checked ? <QuestionChecklist result={result} /> : null}
          </article>
        );
      })}

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <p className="text-sm font-semibold text-kid-ink/70">
          {activity.prompts.length} prompt
          {activity.prompts.length === 1 ? "" : "s"}
        </p>
        {allReady ? (
          <KidButton onClick={() => setStage("review")}>
            Send for teacher review
          </KidButton>
        ) : (
          <KidButton
            disabled={activity.prompts.some(
              (prompt) => !(responses[prompt.id] ?? "").trim(),
            )}
            onClick={() => setChecked(true)}
          >
            {checked ? "Check again" : "Check my questions"}
          </KidButton>
        )}
      </KidPanel>
    </div>
  );
}

function QuestionChecklist({ result }: { result: QuestionWritingCheck }) {
  const rows = [
    ["Capital letter", result.capitalLetter],
    ["Question mark", result.questionMark],
    ["Enough words", result.minimumWords],
    ["Prompt words", result.requiredWords],
    ["Question word first", result.questionWord],
    ["Helping verb", result.helpingVerb],
  ] as const;
  return (
    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, pass]) => (
        <p
          key={label}
          className={`flex items-center gap-2 text-xs font-black ${
            pass ? "text-emerald-800" : "text-amber-900"
          }`}
        >
          {pass ? <CircleCheck className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
          {label}
        </p>
      ))}
    </div>
  );
}
