"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, Images } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  isPictureStoryAnswerCorrect,
  isPictureStoryMastered,
  scorePictureStoryPlayable,
  type PictureStoryPlayable,
} from "@/lib/picture-story";
import { useSyncedAnswerMap } from "@/lib/homework-collections/use-synced-answer-map";

type Stage = "overview" | "frames" | "questions" | "review";

type Props = {
  activity: PictureStoryPlayable;
  eyebrow?: string;
  onMastered?: () => void;
  answers?: Record<string, string>;
  onAnswersChange?: (answers: Record<string, string>) => void;
  embedInHomeworkCollection?: boolean;
};

export function PictureStoryPlayer({
  activity,
  eyebrow = "Picture story",
  onMastered,
  answers: controlledAnswers,
  onAnswersChange,
  embedInHomeworkCollection = false,
}: Props) {
  const [answers, setAnswers] = useSyncedAnswerMap(controlledAnswers, onAnswersChange);
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>(
    embedInHomeworkCollection ? "frames" : "overview",
  );
  const [frameIndex, setFrameIndex] = useState(0);
  const [reviewFrameOpen, setReviewFrameOpen] = useState(false);
  const [reviewFrameIndex, setReviewFrameIndex] = useState(0);

  const score = scorePictureStoryPlayable(activity, answers);
  const complete = activity.questions.every((question) =>
    Boolean((answers[question.id] ?? "").trim()),
  );
  const mastered = checked && isPictureStoryMastered(score);
  const frame = activity.frames[frameIndex];
  const reviewFrame = activity.frames[reviewFrameIndex];

  const frameById = useMemo(() => {
    const map = new Map(activity.frames.map((item) => [item.id, item]));
    return map;
  }, [activity.frames]);

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
                ✓ {activity.frames.length} picture
                {activity.frames.length === 1 ? "" : "s"} to read
              </li>
              <li>
                ✓ Then {activity.questions.length} question
                {activity.questions.length === 1 ? "" : "s"}
              </li>
            </ul>
            <KidButton
              className="mt-6"
              onClick={() => {
                setFrameIndex(0);
                setStage("frames");
              }}
            >
              Start
            </KidButton>
          </div>
          <div className="rounded-3xl bg-teal-100 p-7 text-center">
            <Images className="mx-auto h-24 w-24 text-teal-800" />
            <p className="mt-3 text-lg font-black text-[#17375e]">
              Look at each picture.
              <br />
              Then answer.
            </p>
          </div>
        </div>
      </KidPanel>
    );
  }

  if (stage === "frames" && frame) {
    const isLast = frameIndex >= activity.frames.length - 1;
    return (
      <div className="space-y-4">
        <KidPanel className="bg-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-800">
            {eyebrow} · Page {frameIndex + 1} of {activity.frames.length}
          </p>
          <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
        </KidPanel>

        <KidPanel className="bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frame.imageUrl}
            alt={frame.imageAlt}
            className="max-h-80 w-full rounded-2xl object-cover"
          />
          <p className="mt-4 text-base font-semibold leading-8 text-slate-800">{frame.text}</p>
        </KidPanel>

        <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
          <KidButton
            variant="secondary"
            disabled={frameIndex === 0}
            onClick={() => setFrameIndex((current) => Math.max(0, current - 1))}
          >
            Previous
          </KidButton>
          {isLast ? (
            <KidButton onClick={() => setStage("questions")}>Answer questions</KidButton>
          ) : (
            <KidButton
              onClick={() =>
                setFrameIndex((current) =>
                  Math.min(activity.frames.length - 1, current + 1),
                )
              }
            >
              Next
            </KidButton>
          )}
        </KidPanel>
      </div>
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
          {mastered ? "Perfect story work!" : "Keep practising"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-kid-ink/70">
          You got {score.correct} of {score.total} questions correct.
        </p>
        <div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">
          {activity.questions.map((question, index) => {
            const ok = isPictureStoryAnswerCorrect(answers[question.id] ?? "", question);
            const evidence = frameById.get(question.evidenceFrameId);
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
                  {question.type === "multiple_choice"
                    ? `Answer: ${
                        question.options.find((option) => option.id === question.correctOptionId)
                          ?.text ?? question.correctOptionId
                      }`
                    : `Answer: ${question.acceptedAnswers[0] ?? ""}`}
                </p>
                {evidence ? (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Look back: {evidence.imageAlt}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("questions");
              setChecked(false);
              setAnswers({});
              setReviewFrameOpen(false);
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
        {activity.allowStoryReviewDuringQuestions ? (
          <div className="mt-3">
            <KidButton
              variant="secondary"
              onClick={() => {
                setReviewFrameIndex(0);
                setReviewFrameOpen((open) => !open);
              }}
            >
              {reviewFrameOpen ? "Hide story" : "Look at the story again"}
            </KidButton>
          </div>
        ) : null}
      </KidPanel>

      {activity.allowStoryReviewDuringQuestions && reviewFrameOpen && reviewFrame ? (
        <KidPanel className="bg-white">
          <p className="text-xs font-black uppercase tracking-wide text-teal-800">
            Story page {reviewFrameIndex + 1} of {activity.frames.length}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reviewFrame.imageUrl}
            alt={reviewFrame.imageAlt}
            className="mt-3 max-h-56 w-full rounded-2xl object-cover"
          />
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-800">
            {reviewFrame.text}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <KidButton
              variant="secondary"
              disabled={reviewFrameIndex === 0}
              onClick={() => setReviewFrameIndex((current) => Math.max(0, current - 1))}
            >
              Previous
            </KidButton>
            <KidButton
              variant="secondary"
              disabled={reviewFrameIndex >= activity.frames.length - 1}
              onClick={() =>
                setReviewFrameIndex((current) =>
                  Math.min(activity.frames.length - 1, current + 1),
                )
              }
            >
              Next
            </KidButton>
          </div>
        </KidPanel>
      ) : null}

      <div className="space-y-3">
        {activity.questions.map((question, index) => {
          const selected = answers[question.id] ?? "";
          const showResult = checked;
          const ok = isPictureStoryAnswerCorrect(selected, question);
          return (
            <KidPanel key={question.id} className="bg-white">
              <p className="text-xs font-black uppercase tracking-wide text-teal-800">
                Question {index + 1}
              </p>
              <h3 className="mt-1 text-lg font-black text-kid-ink">{question.prompt}</h3>
              {question.type === "multiple_choice" ? (
                <div className="mt-3 space-y-2">
                  {question.options.map((option) => {
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
              ) : (
                <input
                  type="text"
                  aria-label="Type your answer"
                  value={selected}
                  onChange={(event) => {
                    setChecked(false);
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }));
                  }}
                  className={`mt-3 w-full rounded-xl border-2 px-3 py-2.5 text-sm font-bold ${
                    showResult
                      ? ok
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-amber-500 bg-amber-50"
                      : "border-teal-600 bg-white"
                  }`}
                  placeholder="Type your answer…"
                />
              )}
            </KidPanel>
          );
        })}
      </div>

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <p className="text-sm font-semibold text-kid-ink/70">
          {
            activity.questions.filter((question) =>
              Boolean((answers[question.id] ?? "").trim()),
            ).length
          }
          /{activity.questions.length} answered
          {checked ? ` · ${score.correct} correct` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <KidButton variant="secondary" onClick={() => setStage("frames")}>
            Back to story
          </KidButton>
          <KidButton
            disabled={!complete}
            onClick={() => {
              setChecked(true);
              setStage("review");
            }}
          >
            Check my answers
          </KidButton>
        </div>
      </KidPanel>
    </div>
  );
}
