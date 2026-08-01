"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  isPictureClozeAnswerCorrect,
  scorePictureClozeAnswers,
  type PictureClozePlayable,
} from "@/lib/picture-cloze";

type Stage = "overview" | "activity" | "review";

type Props = {
  activity: PictureClozePlayable;
  /** Optional eyebrow above the title (e.g. "Picture cloze"). */
  eyebrow?: string;
  onMastered?: () => void;
};

export function PictureClozePlayer({
  activity,
  eyebrow = "Picture cloze",
  onMastered,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("overview");

  const score = useMemo(
    () => scorePictureClozeAnswers(activity.items, answers).correct,
    [activity.items, answers],
  );
  const complete = activity.items.every((item) => (answers[item.id] ?? "").trim());
  const mastered = checked && score === activity.items.length;

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
              <li>✓ {activity.items.length} picture question{activity.items.length === 1 ? "" : "s"}</li>
              <li>✓ One shared word bank</li>
            </ul>
            <KidButton className="mt-6" onClick={() => setStage("activity")}>
              Start
            </KidButton>
          </div>
          <div className="rounded-3xl bg-sky-100 p-7 text-center">
            <BookOpenCheck className="mx-auto h-24 w-24 text-[#2878b5]" />
            <p className="mt-3 text-lg font-black text-[#17375e]">
              Look carefully.
              <br />
              Write the whole word.
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
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-sky-700">
          Review
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">
          {mastered ? "Picture cloze complete!" : "Good start—try once more."}
        </h2>
        <p className="mt-2 text-lg font-bold text-kid-ink/70">
          You completed {score} of {activity.items.length} sentences correctly.
        </p>
        <div className="mx-auto mt-6 max-w-xl space-y-2 text-left">
          {activity.items.map((item) => {
            const ok = isPictureClozeAnswerCorrect(
              answers[item.id] ?? "",
              item.acceptedAnswers,
            );
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-slate-700">
                  {item.sentenceBefore}
                  <strong>{answers[item.id]}</strong>
                  {item.sentenceAfter}
                </span>
                <span
                  className={
                    ok ? "font-black text-emerald-700" : "font-black text-amber-800"
                  }
                >
                  {ok ? "Correct" : `Answer: ${item.acceptedAnswers[0]}`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setChecked(false);
              setStage("activity");
            }}
          >
            {mastered ? "Practise again" : "Fix my answers"}
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
        <h2 className="text-2xl font-black text-kid-ink">{activity.title}</h2>
        <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
        <div className="mt-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            Word bank
          </p>
          <div className="flex flex-wrap gap-2">
            {activity.wordBank.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => {
                  const firstEmpty = activity.items.find(
                    (item) => !(answers[item.id] ?? "").trim(),
                  );
                  if (firstEmpty) {
                    setAnswers((current) => ({ ...current, [firstEmpty.id]: word }));
                    setChecked(false);
                  }
                }}
                className="rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-[#17375e] hover:border-sky-500 hover:bg-sky-100"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </KidPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        {activity.items.map((item, index) => {
          const correct = isPictureClozeAnswerCorrect(
            answers[item.id] ?? "",
            item.acceptedAnswers,
          );
          return (
            <article
              key={item.id}
              className={`overflow-hidden rounded-2xl border-4 bg-white shadow-[4px_4px_0_0_#bed4e6] ${
                checked
                  ? correct
                    ? "border-emerald-500"
                    : "border-amber-400"
                  : "border-[#17375e]"
              }`}
            >
              <Image
                unoptimized
                src={item.imageUrl}
                alt={item.imageAlt}
                width={640}
                height={400}
                className="aspect-[8/5] w-full bg-sky-50 object-contain"
              />
              <div className="space-y-3 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-sky-700">
                  Picture {index + 1}
                </p>
                <p className="text-lg font-black text-[#17375e]">{item.prompt}</p>
                <label className="block text-base font-bold leading-10 text-slate-700">
                  <span>{item.sentenceBefore}</span>
                  <input
                    value={answers[item.id] ?? ""}
                    disabled={checked && correct}
                    onChange={(event) => {
                      setAnswers((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }));
                      setChecked(false);
                    }}
                    aria-label={`Answer for picture ${index + 1}`}
                    className="mx-2 inline-block w-32 rounded-lg border-2 border-sky-300 bg-sky-50 px-2 py-1 text-center font-black text-[#17375e] focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                  <span>{item.sentenceAfter}</span>
                </label>
                {checked ? (
                  <p
                    className={`rounded-lg px-3 py-2 text-sm font-black ${
                      correct
                        ? "bg-emerald-50 text-emerald-900"
                        : "bg-amber-50 text-amber-950"
                    }`}
                  >
                    {correct
                      ? "Correct!"
                      : "Look at the picture and try another word."}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <div>
          <p className="font-black text-kid-ink">
            {Object.values(answers).filter((answer) => answer.trim()).length} of{" "}
            {activity.items.length} answered
          </p>
          <p className="text-sm font-semibold text-kid-ink/65">
            Finish every sentence before checking.
          </p>
        </div>
        {mastered ? (
          <KidButton onClick={() => setStage("review")}>Review</KidButton>
        ) : (
          <KidButton disabled={!complete} onClick={() => setChecked(true)}>
            {checked ? "Check again" : "Check my answers"}
          </KidButton>
        )}
      </KidPanel>
    </div>
  );
}
