"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, LockKeyhole, RotateCcw } from "lucide-react";
import { PictureClozePlayer } from "@/components/picture-cloze/PictureClozePlayer";
import { PictureWritingPlayer } from "@/components/picture-writing/PictureWritingPlayer";
import { QuestionWritingPlayer } from "@/components/question-writing/QuestionWritingPlayer";
import { SentenceColumnsPlayer } from "@/components/sentence-columns/SentenceColumnsPlayer";
import { VerbTablePlayer } from "@/components/verb-table/VerbTablePlayer";
import { WordAnnotationPlayer } from "@/components/word-annotation/WordAnnotationPlayer";
import { recordHomeworkTemplateCompletion } from "@/lib/actions/class-homework";
import {
  HOMEWORK_TEMPLATE_ONE,
  type PictureClozeSection,
  type PictureWritingSection,
  type QuestionWritingSection,
  type SentenceColumnsSection,
  type VerbTableSection,
  type WordAnnotationSection,
} from "@/lib/homework-templates/homework-template-one";
import {
  pictureClozePlayableFromHt1,
  pictureWritingPlayableFromHt1,
  questionWritingPlayableFromHt1,
  sentenceColumnsPlayableFromHt1,
  verbTablePlayableFromHt1,
  wordAnnotationPlayableFromHt1,
} from "@/lib/homework-templates/homework-template-one-playables";

const STORAGE_KEY = "wke-pilot-homework-template-one:v2";

type PartNumber = 1 | 2 | 3 | 4 | 5 | 6;

type SavedProgress = {
  activePart: PartNumber;
  partOneDone: boolean;
  partTwoDone: boolean;
  partThreeDone: boolean;
  partFourDone: boolean;
  partFiveDone: boolean;
  partSixDone: boolean;
};

function readProgress(): SavedProgress {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (value && typeof value === "object") {
      return {
        activePart: ([1, 2, 3, 4, 5, 6] as const).includes(value.activePart)
          ? value.activePart
          : 1,
        partOneDone: Boolean(value.partOneDone),
        partTwoDone: Boolean(value.partTwoDone),
        partThreeDone: Boolean(value.partThreeDone),
        partFourDone: Boolean(value.partFourDone),
        partFiveDone: Boolean(value.partFiveDone),
        partSixDone: Boolean(value.partSixDone),
      };
    }
  } catch {
    /* Start clean when pilot data is malformed. */
  }
  return {
    activePart: 1,
    partOneDone: false,
    partTwoDone: false,
    partThreeDone: false,
    partFourDone: false,
    partFiveDone: false,
    partSixDone: false,
  };
}

function partAvailable(
  order: number,
  flags: Omit<SavedProgress, "activePart">,
): boolean {
  if (order === 1) return true;
  if (order === 2) return flags.partOneDone;
  if (order === 3) return flags.partTwoDone;
  if (order === 4) return flags.partThreeDone;
  if (order === 5) return flags.partFourDone;
  if (order === 6) return flags.partFiveDone;
  return false;
}

function partDone(order: number, flags: Omit<SavedProgress, "activePart">): boolean {
  if (order === 1) return flags.partOneDone;
  if (order === 2) return flags.partTwoDone;
  if (order === 3) return flags.partThreeDone;
  if (order === 4) return flags.partFourDone;
  if (order === 5) return flags.partFiveDone;
  if (order === 6) return flags.partSixDone;
  return false;
}

export function HomeworkTemplateOnePilot({
  homeworkId,
  alreadyCompleted = false,
}: {
  homeworkId?: string;
  alreadyCompleted?: boolean;
} = {}) {
  const pictureClozeSection = HOMEWORK_TEMPLATE_ONE.sections[0] as PictureClozeSection;
  const annotationSection = HOMEWORK_TEMPLATE_ONE.sections[1] as WordAnnotationSection;
  const sentenceColumnsSection = HOMEWORK_TEMPLATE_ONE
    .sections[2] as SentenceColumnsSection;
  const verbTableSection = HOMEWORK_TEMPLATE_ONE.sections[3] as VerbTableSection;
  const pictureWritingSection = HOMEWORK_TEMPLATE_ONE
    .sections[4] as PictureWritingSection;
  const questionWritingSection = HOMEWORK_TEMPLATE_ONE
    .sections[5] as QuestionWritingSection;

  const playables = useMemo(
    () => ({
      pictureCloze: pictureClozePlayableFromHt1(pictureClozeSection),
      wordAnnotation: wordAnnotationPlayableFromHt1(annotationSection),
      sentenceColumns: sentenceColumnsPlayableFromHt1(sentenceColumnsSection),
      verbTable: verbTablePlayableFromHt1(verbTableSection),
      pictureWriting: pictureWritingPlayableFromHt1(pictureWritingSection),
      questionWriting: questionWritingPlayableFromHt1(questionWritingSection),
    }),
    [
      annotationSection,
      pictureClozeSection,
      pictureWritingSection,
      questionWritingSection,
      sentenceColumnsSection,
      verbTableSection,
    ],
  );

  const [activePart, setActivePart] = useState<PartNumber>(1);
  const [partOneDone, setPartOneDone] = useState(false);
  const [partTwoDone, setPartTwoDone] = useState(false);
  const [partThreeDone, setPartThreeDone] = useState(false);
  const [partFourDone, setPartFourDone] = useState(false);
  const [partFiveDone, setPartFiveDone] = useState(false);
  const [partSixDone, setPartSixDone] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [completionNotice, setCompletionNotice] = useState(
    alreadyCompleted ? "This homework is already marked complete." : "",
  );

  const progressFlags = {
    partOneDone,
    partTwoDone,
    partThreeDone,
    partFourDone,
    partFiveDone,
    partSixDone,
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readProgress();
      setActivePart(saved.activePart);
      setPartOneDone(saved.partOneDone);
      setPartTwoDone(saved.partTwoDone);
      setPartThreeDone(saved.partThreeDone);
      setPartFourDone(saved.partFourDone);
      setPartFiveDone(saved.partFiveDone);
      setPartSixDone(saved.partSixDone);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activePart,
        ...progressFlags,
      } satisfies SavedProgress),
    );
  }, [activePart, hydrated, partFiveDone, partFourDone, partOneDone, partSixDone, partThreeDone, partTwoDone]);

  const reset = () => {
    setActivePart(1);
    setPartOneDone(false);
    setPartTwoDone(false);
    setPartThreeDone(false);
    setPartFourDone(false);
    setPartFiveDone(false);
    setPartSixDone(false);
    setResetNonce((value) => value + 1);
    window.localStorage.removeItem(STORAGE_KEY);
    // Clear legacy per-part keys from the pre-shared-player pilot.
    window.localStorage.removeItem("wke-pilot-homework-template-one:v1");
    window.localStorage.removeItem("wke-pilot-homework-template-one:word-annotation:v1");
    window.localStorage.removeItem("wke-pilot-homework-template-one:sentence-columns:v1");
    window.localStorage.removeItem("wke-pilot-homework-template-one:verb-table:v1");
    window.localStorage.removeItem("wke-pilot-homework-template-one:picture-writing:v1");
    window.localStorage.removeItem("wke-pilot-homework-template-one:question-writing:v1");
  };

  const finishAssignedHomework = () => {
    setPartSixDone(true);
    if (!homeworkId || alreadyCompleted) return;
    setCompletionNotice("Saving completion…");
    void recordHomeworkTemplateCompletion({ homeworkId }).then((result) => {
      setCompletionNotice(
        result.ok
          ? "Homework complete — your teacher can now see it."
          : result.error,
      );
    });
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
        Opening homework template…
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#eff8ff_0%,#fff9ed_100%)] px-3 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
          <div>
            <Link
              href={homeworkId ? "/primary" : "/pilots"}
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              ← {homeworkId ? "Primary Home" : "Pilots"}
            </Link>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#17375e]">
              {HOMEWORK_TEMPLATE_ONE.title}
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              {HOMEWORK_TEMPLATE_ONE.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900">
              <Clock3 className="h-4 w-4" />~
              {HOMEWORK_TEMPLATE_ONE.estimatedMinutes} min
            </span>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset pilot
            </button>
          </div>
        </header>

        {completionNotice ? (
          <p className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
            {completionNotice}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Six-part homework
            </p>
            {HOMEWORK_TEMPLATE_ONE.sections.map((item) => {
              const available = partAvailable(item.order, progressFlags);
              const active = item.order === activePart;
              const done = partDone(item.order, progressFlags);
              return (
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    if (available) setActivePart(item.order as PartNumber);
                  }}
                  key={item.id}
                  className={`w-full rounded-xl border-2 p-3 text-left ${
                    active
                      ? "border-sky-500 bg-white shadow-sm"
                      : available
                        ? "border-slate-300 bg-white hover:border-sky-400"
                        : "border-slate-200 bg-white/60 text-slate-500"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                            ? "bg-[#17375e] text-white"
                            : available
                              ? "bg-sky-100 text-sky-900"
                              : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : item.order}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black">{item.title}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {item.skill}
                        {available ? " · ready" : " · locked"}
                      </p>
                    </div>
                    {!available ? (
                      <LockKeyhole className="ml-auto h-4 w-4 shrink-0" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </aside>

          <div className="min-w-0 space-y-3">
            {activePart > 1 ? (
              <button
                type="button"
                onClick={() => setActivePart((activePart - 1) as PartNumber)}
                className="text-sm font-black text-sky-800 underline underline-offset-4"
              >
                Back to Part {activePart - 1}
              </button>
            ) : null}

            {activePart === 1 ? (
              <PictureClozePlayer
                key={`${resetNonce}-part-1`}
                activity={playables.pictureCloze}
                eyebrow="Part 1 of 6 · Vocabulary"
                onMastered={() => {
                  setPartOneDone(true);
                  setActivePart(2);
                }}
              />
            ) : null}

            {activePart === 2 ? (
              <WordAnnotationPlayer
                key={`${resetNonce}-part-2`}
                activity={playables.wordAnnotation}
                eyebrow="Part 2 of 6 · Grammar"
                onMastered={() => {
                  setPartTwoDone(true);
                  setActivePart(3);
                }}
              />
            ) : null}

            {activePart === 3 ? (
              <SentenceColumnsPlayer
                key={`${resetNonce}-part-3`}
                activity={playables.sentenceColumns}
                eyebrow="Part 3 of 6 · Grammar"
                onMastered={() => {
                  setPartThreeDone(true);
                  setActivePart(4);
                }}
              />
            ) : null}

            {activePart === 4 ? (
              <VerbTablePlayer
                key={`${resetNonce}-part-4`}
                activity={playables.verbTable}
                eyebrow="Part 4 of 6 · Grammar"
                onMastered={() => {
                  setPartFourDone(true);
                  setActivePart(5);
                }}
              />
            ) : null}

            {activePart === 5 ? (
              <PictureWritingPlayer
                key={`${resetNonce}-part-5`}
                activity={playables.pictureWriting}
                eyebrow="Part 5 of 6 · Writing"
                onReady={() => {
                  setPartFiveDone(true);
                  setActivePart(6);
                }}
              />
            ) : null}

            {activePart === 6 ? (
              <QuestionWritingPlayer
                key={`${resetNonce}-part-6`}
                activity={playables.questionWriting}
                eyebrow="Part 6 of 6 · Writing"
                onReady={finishAssignedHomework}
              />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
