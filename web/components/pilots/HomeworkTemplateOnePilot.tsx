"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, LockKeyhole, RotateCcw } from "lucide-react";
import { PictureClozePlayer } from "@/components/picture-cloze/PictureClozePlayer";
import { PictureWritingPlayer } from "@/components/picture-writing/PictureWritingPlayer";
import { QuestionWritingPlayer } from "@/components/question-writing/QuestionWritingPlayer";
import { SentenceColumnsPlayer } from "@/components/sentence-columns/SentenceColumnsPlayer";
import { VerbTablePlayer } from "@/components/verb-table/VerbTablePlayer";
import { WordAnnotationPlayer } from "@/components/word-annotation/WordAnnotationPlayer";
import { recordHomeworkTemplateCompletion } from "@/lib/actions/class-homework";
import { saveHomeworkTemplatePart } from "@/lib/actions/homework-template-submission";
import type { HomeworkTemplatePartSnapshot } from "@/lib/homework-templates/homework-template-submission";
import {
  HOMEWORK_TEMPLATE_ONE,
  type HomeworkTemplateOne,
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

const STORAGE_KEY = "wke-pilot-homework-template-one:v3";

type HomeworkTemplateOneSection = HomeworkTemplateOne["sections"][number];

type SavedProgress = {
  activeSectionId: string;
  doneSectionIds: string[];
};

function sortSections(document: HomeworkTemplateOne): HomeworkTemplateOneSection[] {
  return [...document.sections].sort((a, b) => a.order - b.order);
}

function skillLabel(skill: string): string {
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

function readProgress(
  storageKey: string,
  sectionIds: ReadonlySet<string>,
  fallbackActiveId: string,
): SavedProgress {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    if (value && typeof value === "object") {
      const activeSectionId =
        typeof value.activeSectionId === "string" &&
        sectionIds.has(value.activeSectionId)
          ? value.activeSectionId
          : fallbackActiveId;
      const doneSectionIds = Array.isArray(value.doneSectionIds)
        ? value.doneSectionIds.filter(
            (id: unknown): id is string =>
              typeof id === "string" && sectionIds.has(id),
          )
        : [];
      return { activeSectionId, doneSectionIds };
    }
  } catch {
    /* Start clean when pilot data is malformed. */
  }
  return { activeSectionId: fallbackActiveId, doneSectionIds: [] };
}

function sectionAvailable(
  index: number,
  navSections: HomeworkTemplateOneSection[],
  doneSectionIds: ReadonlySet<string>,
  unlockAll: boolean,
): boolean {
  if (unlockAll) return true;
  if (index <= 0) return true;
  const previous = navSections[index - 1];
  return previous ? doneSectionIds.has(previous.id) : false;
}

export function HomeworkTemplateOnePilot({
  homeworkId,
  alreadyCompleted = false,
  homeHref = "/primary",
  document: documentProp,
  mode = "student",
  focusSectionId = null,
  deferOverallCompletion = false,
}: {
  homeworkId?: string;
  alreadyCompleted?: boolean;
  /** Where to send the student after they finish assigned homework. */
  homeHref?: string;
  /** Frozen graded-track / template clone; defaults to live source template. */
  document?: HomeworkTemplateOne;
  /** Compiler embed: unlock parts, skip pilot chrome/storage, follow focus. */
  mode?: "student" | "authoring-preview";
  /** Section id (e.g. picture-cloze) to show while authoring. */
  focusSectionId?: string | null;
  /** Mixed collections submit globally after their generic activities. */
  deferOverallCompletion?: boolean;
} = {}) {
  const router = useRouter();
  const authoringPreview = mode === "authoring-preview";
  const storageKey = homeworkId ? `${STORAGE_KEY}:${homeworkId}` : STORAGE_KEY;
  const templateDocument = documentProp ?? HOMEWORK_TEMPLATE_ONE;

  const navSections = useMemo(
    () => sortSections(templateDocument),
    [templateDocument],
  );
  const sectionIds = useMemo(
    () => new Set(navSections.map((section) => section.id)),
    [navSections],
  );
  const firstSectionId = navSections[0]?.id ?? "";

  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (authoringPreview && focusSectionId && sectionIds.has(focusSectionId)) {
      return focusSectionId;
    }
    return firstSectionId;
  });
  const [doneSectionIds, setDoneSectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [resetNonce, setResetNonce] = useState(0);
  const [hydrated, setHydrated] = useState(authoringPreview);
  const [completionNotice, setCompletionNotice] = useState(
    alreadyCompleted
      ? "This homework is already marked complete. You can redo it to send reviewable answers to your teacher."
      : "",
  );

  useEffect(() => {
    if (authoringPreview) return;
    const timer = window.setTimeout(() => {
      const saved = readProgress(storageKey, sectionIds, firstSectionId);
      setActiveSectionId(saved.activeSectionId);
      setDoneSectionIds(new Set(saved.doneSectionIds));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authoringPreview, firstSectionId, sectionIds, storageKey]);

  useEffect(() => {
    if (authoringPreview || !hydrated) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        activeSectionId,
        doneSectionIds: [...doneSectionIds],
      } satisfies SavedProgress),
    );
  }, [
    activeSectionId,
    authoringPreview,
    doneSectionIds,
    hydrated,
    storageKey,
  ]);

  useEffect(() => {
    if (!authoringPreview || !focusSectionId) return;
    if (sectionIds.has(focusSectionId)) {
      setActiveSectionId(focusSectionId);
    }
  }, [authoringPreview, focusSectionId, sectionIds]);

  const reset = () => {
    setActiveSectionId(firstSectionId);
    setDoneSectionIds(new Set());
    setResetNonce((value) => value + 1);
    setCompletionNotice("");
    if (!authoringPreview) {
      window.localStorage.removeItem(storageKey);
    }
    window.localStorage.removeItem(
      "wke-pilot-homework-template-one:picture-writing:v1",
    );
    window.localStorage.removeItem(
      "wke-pilot-homework-template-one:question-writing:v1",
    );
  };

  const markSectionDoneAndAdvance = (sectionId: string) => {
    setDoneSectionIds((current) => new Set(current).add(sectionId));
    const index = navSections.findIndex((section) => section.id === sectionId);
    const next = index >= 0 ? navSections[index + 1] : undefined;
    if (next) setActiveSectionId(next.id);
  };

  const savePartThen = (
    partId: string,
    snapshot: HomeworkTemplatePartSnapshot,
    onSaved: () => void,
  ) => {
    if (!homeworkId) {
      onSaved();
      return;
    }
    setCompletionNotice("Saving your work…");
    void saveHomeworkTemplatePart({ homeworkId, partId, snapshot }).then(
      (result) => {
        if (!result.ok) {
          setCompletionNotice(result.error);
          return;
        }
        setCompletionNotice("");
        onSaved();
      },
    );
  };

  const completeSection = (
    sectionId: string,
    snapshot: HomeworkTemplatePartSnapshot,
  ) => {
    const index = navSections.findIndex((section) => section.id === sectionId);
    const isLast = index >= 0 && index === navSections.length - 1;

    if (isLast && homeworkId) {
      setCompletionNotice("Submitting your work…");
      void saveHomeworkTemplatePart({
        homeworkId,
        partId: sectionId,
        snapshot,
        submit: true,
      }).then(async (submissionResult) => {
        if (!submissionResult.ok) {
          setCompletionNotice(submissionResult.error);
          return;
        }
        if (deferOverallCompletion) {
          setDoneSectionIds((current) => new Set(current).add(sectionId));
          setCompletionNotice("Template activities saved. Continue to the collection activities below.");
          return;
        }
        const result = await recordHomeworkTemplateCompletion({ homeworkId });
        if (!result.ok) {
          setCompletionNotice(result.error);
          return;
        }
        setDoneSectionIds((current) => new Set(current).add(sectionId));
        setCompletionNotice("Homework submitted — heading home…");
        router.push(homeHref);
      });
      return;
    }

    savePartThen(sectionId, snapshot, () => {
      markSectionDoneAndAdvance(sectionId);
    });
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
        Opening homework template…
      </div>
    );
  }

  const assigned = Boolean(homeworkId);
  const embedded = authoringPreview || assigned;
  const activeIndex = navSections.findIndex(
    (section) => section.id === activeSectionId,
  );
  const activeSection =
    (activeIndex >= 0 ? navSections[activeIndex] : navSections[0]) ?? null;
  const previousSection =
    activeIndex > 0 ? (navSections[activeIndex - 1] ?? null) : null;
  const partNumber = activeIndex >= 0 ? activeIndex + 1 : 1;
  const partCount = navSections.length;

  const activePlayable = (() => {
    if (!activeSection) return null;
    switch (activeSection.kind) {
      case "picture_cloze":
        return {
          kind: "picture_cloze" as const,
          activity: pictureClozePlayableFromHt1(
            activeSection as PictureClozeSection,
          ),
        };
      case "word_annotation":
        return {
          kind: "word_annotation" as const,
          activity: wordAnnotationPlayableFromHt1(
            activeSection as WordAnnotationSection,
          ),
        };
      case "sentence_columns":
        return {
          kind: "sentence_columns" as const,
          activity: sentenceColumnsPlayableFromHt1(
            activeSection as SentenceColumnsSection,
          ),
        };
      case "verb_table":
        return {
          kind: "verb_table" as const,
          activity: verbTablePlayableFromHt1(
            activeSection as VerbTableSection,
          ),
        };
      case "picture_writing":
        return {
          kind: "picture_writing" as const,
          activity: pictureWritingPlayableFromHt1(
            activeSection as PictureWritingSection,
          ),
        };
      case "question_writing":
        if (activeSection.status !== "ready") return null;
        return {
          kind: "question_writing" as const,
          activity: questionWritingPlayableFromHt1(
            activeSection as QuestionWritingSection,
          ),
        };
      default:
        return null;
    }
  })();

  const eyebrow =
    activeSection
      ? `Part ${partNumber} of ${partCount} · ${skillLabel(activeSection.skill)}`
      : undefined;

  return (
    <div
      className={
        embedded
          ? "space-y-4 p-3 sm:p-4"
          : "min-h-dvh bg-[linear-gradient(180deg,#eff8ff_0%,#fff9ed_100%)] px-3 py-5 sm:px-6"
      }
    >
      <div className={embedded ? "space-y-4" : "mx-auto max-w-7xl space-y-4"}>
        {authoringPreview ? (
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Teacher preview · student view
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-[#17375e]">
                {templateDocument.title}
              </h1>
              <p className="text-sm font-semibold text-slate-600">
                {templateDocument.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900">
                <Clock3 className="h-4 w-4" />~
                {templateDocument.estimatedMinutes} min
              </span>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset preview
              </button>
            </div>
          </header>
        ) : assigned ? null : (
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
            <div>
              <Link
                href="/pilots"
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                ← Pilots
              </Link>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#17375e]">
                {templateDocument.title}
              </h1>
              <p className="text-sm font-semibold text-slate-600">
                {templateDocument.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900">
                <Clock3 className="h-4 w-4" />~
                {templateDocument.estimatedMinutes} min
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
        )}

        {completionNotice ? (
          <p className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
            {completionNotice}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center justify-between gap-2 px-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {partCount}-part homework
              </p>
              {assigned ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Reset progress"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              ) : null}
            </div>
            {navSections.map((item, index) => {
              const available = sectionAvailable(
                index,
                navSections,
                doneSectionIds,
                authoringPreview,
              );
              const active = item.id === activeSectionId;
              const done = doneSectionIds.has(item.id);
              return (
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    if (available) setActiveSectionId(item.id);
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
            {previousSection ? (
              <button
                type="button"
                onClick={() => setActiveSectionId(previousSection.id)}
                className="text-sm font-black text-sky-800 underline underline-offset-4"
              >
                Back to Part {previousSection.order}
              </button>
            ) : null}

            {activeSection &&
            activePlayable?.kind === "picture_cloze" ? (
              <PictureClozePlayer
                key={`${resetNonce}-${activeSection.id}`}
                activity={activePlayable.activity}
                eyebrow={eyebrow}
                doneLabel={assigned ? "Continue" : "Done"}
                onMastered={(snapshot) =>
                  completeSection(activeSection.id, snapshot)
                }
              />
            ) : null}

            {activeSection &&
            activePlayable?.kind === "word_annotation" ? (
              <WordAnnotationPlayer
                key={`${resetNonce}-${activeSection.id}`}
                activity={activePlayable.activity}
                eyebrow={eyebrow}
                onMastered={(snapshot) =>
                  completeSection(activeSection.id, snapshot)
                }
              />
            ) : null}

            {activeSection &&
            activePlayable?.kind === "sentence_columns" ? (
              <SentenceColumnsPlayer
                key={`${resetNonce}-${activeSection.id}`}
                activity={activePlayable.activity}
                eyebrow={eyebrow}
                onMastered={(snapshot) =>
                  completeSection(activeSection.id, snapshot)
                }
              />
            ) : null}

            {activeSection && activePlayable?.kind === "verb_table" ? (
              <VerbTablePlayer
                key={`${resetNonce}-${activeSection.id}`}
                activity={activePlayable.activity}
                eyebrow={eyebrow}
                onMastered={(snapshot) =>
                  completeSection(activeSection.id, snapshot)
                }
              />
            ) : null}

            {activeSection &&
            activePlayable?.kind === "picture_writing" ? (
              <PictureWritingPlayer
                key={`${resetNonce}-${activeSection.id}`}
                activity={activePlayable.activity}
                eyebrow={eyebrow}
                onReady={(snapshot) =>
                  completeSection(activeSection.id, snapshot)
                }
              />
            ) : null}

            {activeSection &&
            activePlayable?.kind === "question_writing" ? (
              <QuestionWritingPlayer
                key={`${resetNonce}-${activeSection.id}`}
                activity={activePlayable.activity}
                eyebrow={eyebrow}
                doneLabel={
                  assigned && activeIndex === navSections.length - 1
                    ? "Finish homework"
                    : "Done"
                }
                onReady={(snapshot) =>
                  completeSection(activeSection.id, snapshot)
                }
              />
            ) : null}

            {activeSection && !activePlayable ? (
              <p className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
                This part isn’t available in the current preview document.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
