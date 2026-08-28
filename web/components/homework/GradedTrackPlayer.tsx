"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { HomeworkCollectionPlayer } from "@/components/homework/HomeworkCollectionPlayer";
import { HomeworkTemplateOnePilot } from "@/components/pilots/HomeworkTemplateOnePilot";
import { SecondaryHomeworkOneShell } from "@/components/secondary/SecondaryHomeworkOneShell";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordHomeworkTemplateCompletion } from "@/lib/actions/class-homework";
import { saveHomeworkCollectionAttempt } from "@/lib/actions/homework-collection-attempt";
import type { GradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import type { HomeworkCollectionAttempt } from "@/lib/homework-collections";
import type { HomeworkTemplateSubmission } from "@/lib/homework-templates/homework-template-submission";
import type { AssessmentSpeakingRecording } from "@/lib/assessment";
import {
  resolveGradedTrack,
  type GradedTrackSegment,
} from "@/lib/graded-tracks";
import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

type CollectionResponses = Record<string, { answers: Record<string, string> }>;

type Props = {
  freeze: GradedTrackFreezeDocument;
  homeworkId?: string;
  alreadyCompleted?: boolean;
  mode?: "student" | "authoring-preview";
  focusPartId?: string | null;
  initialCollectionAttempt?: HomeworkCollectionAttempt | null;
  initialTemplateSubmission?: HomeworkTemplateSubmission | null;
  initialSpeakingRecordings?: readonly AssessmentSpeakingRecording[];
  homeHref?: string;
};

function responsesFromAttempt(
  attempt?: HomeworkCollectionAttempt | null,
): CollectionResponses {
  if (!attempt) return {};
  return Object.fromEntries(
    Object.entries(attempt.content.parts).map(([partId, part]) => [
      partId,
      { answers: { ...part.answers } },
    ]),
  );
}

function gradingBadge(policy: GradedTrackSegment["gradingPolicy"]) {
  if (policy === "teacher_review") {
    return {
      label: "Teacher review",
      className: "bg-violet-100 text-violet-800",
    };
  }
  if (policy === "completion") {
    return {
      label: "Completion",
      className: "bg-sky-100 text-sky-800",
    };
  }
  if (policy === "automatic") {
    return {
      label: "Auto-graded",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  return {
    label: "Practice",
    className: "bg-stone-100 text-stone-700",
  };
}

function SegmentHeader({
  segment,
  index,
  total,
}: {
  segment: GradedTrackSegment;
  index: number;
  total: number;
}) {
  const badge = gradingBadge(segment.gradingPolicy);
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-teal-700">
          Activity {index + 1} of {total}
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <h2 className="mt-2 text-2xl font-extrabold text-stone-900">
        {segment.label}
      </h2>
    </header>
  );
}

export function GradedTrackPlayer({
  freeze,
  homeworkId,
  alreadyCompleted = false,
  mode = "student",
  focusPartId = null,
  initialCollectionAttempt = null,
  initialTemplateSubmission = null,
  initialSpeakingRecordings = [],
  homeHref,
}: Props) {
  const authoringPreview = mode === "authoring-preview";
  const resolved = useMemo(() => resolveGradedTrack(freeze), [freeze]);
  const { segments } = resolved;
  const hasCollectionSegments = segments.some(
    (segment) => segment.type === "collection",
  );
  const hasTemplateSegments = segments.some(
    (segment) => segment.type !== "collection",
  );

  const [activeIndex, setActiveIndex] = useState(() => {
    const focusIndex = focusPartId
      ? segments.findIndex((segment) => segment.partId === focusPartId)
      : -1;
    return focusIndex >= 0 ? focusIndex : 0;
  });
  const [collectionResponses, setCollectionResponses] =
    useState<CollectionResponses>(() =>
      responsesFromAttempt(initialCollectionAttempt),
    );
  const [speakingRecordings, setSpeakingRecordings] = useState<
    AssessmentSpeakingRecording[]
  >(() => [...initialSpeakingRecordings]);
  const [finished, setFinished] = useState(alreadyCompleted);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayIndex =
    authoringPreview && focusPartId
      ? Math.max(
          0,
          segments.findIndex((segment) => segment.partId === focusPartId),
        )
      : activeIndex;
  const segment = segments[displayIndex] ?? segments[0];
  if (!segment) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 px-4 py-5 text-sm font-semibold text-stone-600">
        This graded track has no activities yet.
      </p>
    );
  }

  const saveCollectionDraft = async (submit: boolean) => {
    if (!homeworkId || !freeze.collectionDocument) return { ok: true as const };
    const result = await saveHomeworkCollectionAttempt({
      homeworkId,
      responses: collectionResponses,
      submit,
    });
    if (!result.ok) return result;
    if (result.rewardReceipt) acceptPrimaryRewardReceipt(result.rewardReceipt);
    return result;
  };

  const handleNavigate = (nextIndex: number) => {
    if (authoringPreview) {
      setActiveIndex(nextIndex);
      return;
    }
    setNotice(null);
    startTransition(async () => {
      if (hasCollectionSegments && homeworkId) {
        const result = await saveCollectionDraft(false);
        if (!result.ok) {
          setNotice(result.error);
          return;
        }
      }
      setActiveIndex(nextIndex);
    });
  };

  const handleFinalSubmit = () => {
    if (authoringPreview) return;
    setNotice(null);
    startTransition(async () => {
      if (hasCollectionSegments && homeworkId) {
        const collectionResult = await saveCollectionDraft(true);
        if (!collectionResult.ok) {
          setNotice(collectionResult.error);
          return;
        }
      }
      if (hasTemplateSegments && homeworkId) {
        const completion = await recordHomeworkTemplateCompletion({ homeworkId });
        if (!completion.ok) {
          setNotice(completion.error);
          return;
        }
        if (completion.rewardReceipt) {
          acceptPrimaryRewardReceipt(completion.rewardReceipt);
        }
      }
      setFinished(true);
    });
  };

  if (finished) {
    return (
      <HomeworkFinishPanel
        title="Homework submitted"
        detail="Your answers were saved. Teacher-reviewed activities will appear after feedback."
        saving={pending}
        saved
        saveError={notice}
        retryLabel="Review activities"
        onRetry={() => setFinished(false)}
      />
    );
  }

  const primaryDocument =
    freeze.level === "primary" ? freeze.primaryDocument : undefined;
  const secondaryDocument =
    freeze.level === "secondary" ? freeze.secondaryDocument : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-5">
      {alreadyCompleted && !authoringPreview ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          This homework is already complete. You can still review your work.
        </p>
      ) : null}

      <nav
        className="flex gap-1 overflow-x-auto pb-1"
        aria-label="Graded track activities"
      >
        {segments.map((entry, index) => {
          const answered =
            entry.type === "collection"
              ? Object.values(collectionResponses[entry.partId]?.answers ?? {}).filter(
                  Boolean,
                ).length > 0
              : Boolean(initialTemplateSubmission?.content.parts[entry.partId]);
          return (
            <button
              key={entry.partId}
              type="button"
              onClick={() => handleNavigate(index)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold ${
                index === displayIndex
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-stone-200 bg-white text-stone-700"
              }`}
            >
              {answered ? <Check className="h-3.5 w-3.5" /> : null}
              {index + 1}. {entry.label}
            </button>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <SegmentHeader
          segment={segment}
          index={displayIndex}
          total={segments.length}
        />

        <div className="mt-6">
          {segment.type === "collection" ? (
            <HomeworkCollectionPlayer
              document={{ version: 1, parts: [segment.part] }}
              homeworkId={homeworkId}
              initialAttempt={initialCollectionAttempt}
              alreadyCompleted={alreadyCompleted}
              mode={mode}
              focusPartId={segment.partId}
              segmentMode
              responses={collectionResponses}
              onResponsesChange={setCollectionResponses}
              speakingRecordings={speakingRecordings}
              onSpeakingRecordingSaved={(recording) => {
                setSpeakingRecordings((current) => {
                  const without = current.filter(
                    (entry) =>
                      !(
                        entry.partId === recording.partId &&
                        entry.responseId === recording.responseId
                      ),
                  );
                  return [...without, recording];
                });
              }}
            />
          ) : null}

          {segment.type === "primary_template" && primaryDocument ? (
            <HomeworkTemplateOnePilot
              homeworkId={homeworkId}
              alreadyCompleted={alreadyCompleted}
              homeHref={homeHref}
              document={{
                ...primaryDocument,
                sections: [segment.section],
              }}
              mode={mode}
              focusSectionId={segment.sectionId}
              segmentMode
              deferOverallCompletion
            />
          ) : null}

          {segment.type === "secondary_template" && secondaryDocument ? (
            <SecondaryHomeworkOneShell
              homeworkId={homeworkId}
              alreadyCompleted={alreadyCompleted}
              homeHref={homeHref ?? "/secondary"}
              content={secondaryDocument}
              mode={mode}
              focusPartId={segment.partId}
              partInstances={[segment.instance]}
              partLabels={{ [segment.partId]: segment.label }}
              title={freeze.title}
              subtitle={freeze.instructions || undefined}
              visiblePartIds={[segment.sectionId]}
              initialSubmission={initialTemplateSubmission}
              initialRecordings={initialSpeakingRecordings}
              segmentMode
              deferOverallCompletion
            />
          ) : null}
        </div>

        {notice ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
            {notice}
          </p>
        ) : null}

        {!authoringPreview ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              disabled={pending || displayIndex === 0}
              onClick={() => handleNavigate(Math.max(0, displayIndex - 1))}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-stone-300 px-4 text-sm font-bold disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            {displayIndex < segments.length - 1 ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleNavigate(displayIndex + 1)}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-teal-700 px-4 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save & continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={handleFinalSubmit}
                className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {pending ? "Submitting…" : "Submit homework"}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
