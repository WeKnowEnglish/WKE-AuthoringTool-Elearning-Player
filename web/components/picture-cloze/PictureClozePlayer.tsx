"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { HomeworkHelpHintCard, HomeworkHelpMascot, HomeworkHelpTrigger } from "@/components/homework-help/HomeworkHelpCoach";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  advancePictureClozeHelp,
  emptyHelpStruggle,
  getPictureClozeHelpStep,
  pictureClozeScaffoldFirstLetter,
  recordPictureClozeWrongCheck,
  resolveUnlockedHelpLevel,
  type HelpAction,
  type HelpStruggle,
} from "@/lib/homework-help";
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
  /** Label for the mastered review CTA. */
  doneLabel?: string;
  onMastered?: (snapshot: { answers: Record<string, string>; correct: number; total: number }) => void;
};

function shuffleWords(words: readonly string[]): string[] {
  const next = [...words];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index]!;
    next[index] = next[swap]!;
    next[swap] = current;
  }
  return next;
}

export function PictureClozePlayer({
  activity,
  eyebrow = "Picture cloze",
  doneLabel = "Done",
  onMastered,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("overview");
  const [currentIndex, setCurrentIndex] = useState(0);
  /** Stable per mount so bank order doesn't jump while answering. */
  const [wordBank] = useState(() => shuffleWords(activity.wordBank));
  const [struggleByItem, setStruggleByItem] = useState<Record<string, HelpStruggle>>(
    {},
  );
  const [helpedItemIds, setHelpedItemIds] = useState<Record<string, true>>({});
  const [helpOpen, setHelpOpen] = useState(false);

  const score = useMemo(
    () => scorePictureClozeAnswers(activity.items, answers).correct,
    [activity.items, answers],
  );
  const complete = activity.items.every((item) => (answers[item.id] ?? "").trim());
  const mastered = checked && score === activity.items.length;
  const total = activity.items.length;
  const item = activity.items[currentIndex] ?? activity.items[0];
  const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;
  const currentAnswer = answers[item?.id ?? ""] ?? "";
  const currentCorrect =
    item != null
      ? isPictureClozeAnswerCorrect(currentAnswer, item.acceptedAnswers)
      : false;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total - 1;

  const struggle = item
    ? (struggleByItem[item.id] ?? emptyHelpStruggle())
    : emptyHelpStruggle();
  const helpStep = item
    ? getPictureClozeHelpStep({
        item,
        wordBank,
        answer: currentAnswer,
        struggle,
        instructions: activity.instructions,
      })
    : null;
  const unlockedLevel = resolveUnlockedHelpLevel(struggle);
  const scaffoldLetter =
    item && (unlockedLevel === "scaffold" || unlockedLevel === "reveal")
      ? pictureClozeScaffoldFirstLetter(item)
      : null;

  const updateStruggle = (itemId: string, next: HelpStruggle) => {
    setStruggleByItem((current) => ({ ...current, [itemId]: next }));
  };

  const revealCurrentAnswer = () => {
    if (!item) return;
    const answer = item.acceptedAnswers[0]?.trim();
    if (!answer) return;
    setAnswers((current) => ({ ...current, [item.id]: answer }));
    setHelpedItemIds((current) => ({ ...current, [item.id]: true }));
    setChecked(false);
    setHelpOpen(false);
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
              <li>✓ {activity.items.length} picture question{activity.items.length === 1 ? "" : "s"}</li>
              <li>✓ One shared word bank</li>
              <li>✓ One picture at a time</li>
              <li>✓ Helper if you get stuck</li>
            </ul>
            <KidButton
              className="mt-6"
              onClick={() => {
                setCurrentIndex(0);
                setStage("activity");
              }}
            >
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
          {activity.items.map((reviewItem) => {
            const ok = isPictureClozeAnswerCorrect(
              answers[reviewItem.id] ?? "",
              reviewItem.acceptedAnswers,
            );
            const helped = Boolean(helpedItemIds[reviewItem.id]);
            return (
              <div
                key={reviewItem.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-slate-700">
                  {reviewItem.sentenceBefore}
                  <strong>{answers[reviewItem.id]}</strong>
                  {reviewItem.sentenceAfter}
                </span>
                <span
                  className={
                    ok
                      ? helped
                        ? "font-black text-sky-700"
                        : "font-black text-emerald-700"
                      : "font-black text-amber-800"
                  }
                >
                  {ok ? (helped ? "Helped" : "Correct") : `Answer: ${reviewItem.acceptedAnswers[0]}`}
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
              setCurrentIndex(0);
              setStage("activity");
            }}
          >
            {mastered ? "Practise again" : "Fix my answers"}
          </KidButton>
          {mastered && onMastered ? (
            <KidButton onClick={() => onMastered({ answers, correct: score, total })}>{doneLabel}</KidButton>
          ) : null}
        </div>
      </KidPanel>
    );
  }

  if (!item || !helpStep) return null;

  const onHelpAction = (action: HelpAction) => {
    if (action === "got_it") {
      setHelpOpen(false);
      return;
    }
    if (action === "show_answer") {
      revealCurrentAnswer();
      return;
    }
    updateStruggle(item.id, advancePictureClozeHelp(struggle));
    setHelpOpen(true);
  };

  return (
    <div
      className={`gap-4 ${
        helpOpen
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] xl:grid-cols-[minmax(0,1fr)_14rem]"
          : ""
      }`}
    >
      <div className="min-w-0 space-y-4">
        <KidPanel className="bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-kid-ink">{activity.title}</h2>
              <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
            </div>
            <p className="shrink-0 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-sky-800">
              Picture {currentIndex + 1} of {total}
            </p>
          </div>
        </KidPanel>

        <div
          className="flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Question progress"
        >
          {activity.items.map((dotItem, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = Boolean((answers[dotItem.id] ?? "").trim());
            return (
              <button
                key={dotItem.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Picture ${index + 1}${isAnswered ? ", answered" : ""}`}
                onClick={() => {
                  setCurrentIndex(index);
                  setHelpOpen(false);
                }}
                className={`rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                  isCurrent
                    ? "h-2.5 w-8 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                    : isAnswered
                      ? "h-2.5 w-2.5 bg-emerald-300 hover:scale-110"
                      : "h-2.5 w-2.5 bg-slate-300 hover:scale-110 hover:bg-slate-400"
                }`}
              />
            );
          })}
        </div>

        <div className="grid items-start gap-4 md:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-[12.5rem_minmax(0,1fr)]">
          <aside className="rounded-2xl border-2 border-sky-100 bg-white p-3 shadow-sm md:sticky md:top-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Word bank
            </p>
            {scaffoldLetter ? (
              <p className="mb-2 text-[11px] font-bold text-emerald-800">
                Tip: try words starting with {scaffoldLetter}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
              {wordBank.map((word) => {
                const matchesScaffold =
                  !scaffoldLetter ||
                  word.trim().charAt(0).toLocaleUpperCase() === scaffoldLetter;
                const selected =
                  currentAnswer.trim().toLowerCase() === word.trim().toLowerCase();
                return (
                  <button
                    key={word}
                    type="button"
                    onClick={() => {
                      setAnswers((current) => ({ ...current, [item.id]: word }));
                      setChecked(false);
                    }}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-black transition md:w-full ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : matchesScaffold
                          ? "border-sky-200 bg-sky-50 text-[#17375e] hover:border-sky-500 hover:bg-sky-100"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </aside>

          <article
            className={`min-w-0 overflow-hidden rounded-2xl border-4 bg-white shadow-[4px_4px_0_0_#bed4e6] ${
              checked
                ? currentCorrect
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
              className="h-auto w-full bg-white object-contain"
            />
            <div className="space-y-1.5 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">
                Picture {currentIndex + 1}
                {helpedItemIds[item.id] ? " · helped" : ""}
              </p>
              <p className="text-lg font-black leading-snug text-[#17375e]">{item.prompt}</p>
              <label className="block text-base font-bold leading-8 text-slate-700">
                <span>{item.sentenceBefore}</span>
                <input
                  value={currentAnswer}
                  disabled={checked && currentCorrect}
                  onChange={(event) => {
                    setAnswers((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }));
                    setChecked(false);
                  }}
                  aria-label={`Answer for picture ${currentIndex + 1}`}
                  className="mx-2 inline-block w-32 rounded-lg border-2 border-sky-300 bg-sky-50 px-2 py-1 text-center font-black text-[#17375e] focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
                <span>{item.sentenceAfter}</span>
              </label>
              {checked ? (
                <p
                  className={`rounded-lg px-3 py-2 text-sm font-black ${
                    currentCorrect
                      ? "bg-emerald-50 text-emerald-900"
                      : "bg-amber-50 text-amber-950"
                  }`}
                >
                  {currentCorrect
                    ? helpedItemIds[item.id]
                      ? "Filled with help — you can keep going."
                      : "Correct!"
                    : "Not quite. Tap I need help if you are stuck."}
                </p>
              ) : null}
            </div>
          </article>
        </div>

        {helpOpen ? (
          <div className="flex items-stretch gap-3">
            <div className="min-w-0 flex-1">
              <HomeworkHelpHintCard
                step={helpStep}
                onClose={() => setHelpOpen(false)}
                onAction={onHelpAction}
              />
            </div>
            <HomeworkHelpMascot className="hidden shrink-0 self-end sm:flex lg:hidden" />
          </div>
        ) : null}

        <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => {
                setCurrentIndex((index) => Math.max(0, index - 1));
                setHelpOpen(false);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700 transition enabled:hover:border-sky-400 enabled:hover:bg-sky-50 disabled:opacity-35"
              aria-label="Previous picture"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => {
                setCurrentIndex((index) => Math.min(total - 1, index + 1));
                setHelpOpen(false);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700 transition enabled:hover:border-sky-400 enabled:hover:bg-sky-50 disabled:opacity-35"
              aria-label="Next picture"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="ml-1">
              <p className="font-black text-kid-ink">
                {answeredCount} of {total} answered
              </p>
              <p className="text-sm font-semibold text-kid-ink/65">
                Finish every sentence before checking.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <HomeworkHelpTrigger onOpen={() => setHelpOpen(true)} />
            {mastered ? (
              <KidButton onClick={() => setStage("review")}>Review</KidButton>
            ) : (
              <KidButton
                disabled={!complete}
                onClick={() => {
                  setChecked(true);
                  const nextStruggle = { ...struggleByItem };
                  let currentWrong = false;
                  for (const row of activity.items) {
                    const ok = isPictureClozeAnswerCorrect(
                      answers[row.id] ?? "",
                      row.acceptedAnswers,
                    );
                    if (!ok) {
                      nextStruggle[row.id] = recordPictureClozeWrongCheck(
                        nextStruggle[row.id] ?? emptyHelpStruggle(),
                      );
                      if (row.id === item.id) currentWrong = true;
                    }
                  }
                  setStruggleByItem(nextStruggle);
                  if (currentWrong) setHelpOpen(true);
                }}
              >
                {checked ? "Check again" : "Check my answers"}
              </KidButton>
            )}
          </div>
        </KidPanel>
      </div>

      {helpOpen ? (
        <HomeworkHelpMascot className="sticky top-24 hidden min-h-[16rem] lg:flex" />
      ) : null}
    </div>
  );
}
