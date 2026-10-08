"use client";

import { useMemo, useRef, useState, useTransition, type ComponentProps } from "react";
import Link from "next/link";
import {
  archiveClassLesson,
  duplicateClassLesson,
  publishClassLessonToClassroom,
  saveClassLesson,
  unpublishClassLessonFromClassroom,
} from "@/lib/actions/class-lessons";
import type {
  ClassLesson,
  ClassLessonStep,
  ClassLessonStepKind,
  ClassLessonStatus,
  LiveGameQuestionSetOption,
  StudioActivityOption,
  StudioActivityLessonStepConfig,
} from "@/lib/class-lessons/types";
import {
  CLASS_LESSON_PHASE_LABELS,
  CLASS_LESSON_STEP_KIND_LABELS,
  CLASS_LESSON_STEP_KINDS,
} from "@/lib/class-lessons/types";
import { ClassLessonStepEditor } from "@/components/teacher/class-hub/ClassLessonStepEditor";
import { LessonVocabularyPanel } from "@/components/teacher/class-hub/LessonVocabularyPanel";
import { generateLessonVocabularyActivity } from "@/lib/actions/lesson-vocabulary";
import type { LessonVocabularySource } from "@/lib/class-lessons/vocabulary";
import { bankPathForStudioActivity } from "@/lib/studio-activities/paths";
import { lessonReadiness, stepPlanning } from "@/lib/class-lessons/planning";
import { reviewClassLessonDelivery, releaseClassLessonDelivery, type LessonDeliveryReview } from "@/lib/actions/lesson-delivery";
import { LessonHomeworkPanel } from "./LessonHomeworkPanel";
import { MAP_PATH, resourceHref } from "@/lib/course-map/model";

type Props = {
  lesson: ClassLesson;
  archivedClass: boolean;
  studioActivities: StudioActivityOption[];
  liveGameSets: LiveGameQuestionSetOption[];
  onClose: () => void;
  onSaved: (lesson: ClassLesson) => void;
  onDuplicated: (lesson: ClassLesson) => void;
  onArchived: (lessonId: string) => void;
};

type DraftStep = Omit<ClassLessonStep, "position">;

function draftStep(step: DraftStep): DraftStep {
  return { id: step.id, kind: step.kind, title: step.title, phase: step.phase, durationMinutes: step.durationMinutes, teacherAction: step.teacherAction, studentAction: step.studentAction, config: step.config };
}

type PlanContent = Pick<ClassLesson, "title" | "objective" | "durationMinutes" | "targetLanguage" | "successCheck" | "notes" | "vocabularySources"> & { steps: DraftStep[] };
function contentFingerprint(plan: PlanContent): string {
  return JSON.stringify({ title: plan.title, objective: plan.objective, durationMinutes: plan.durationMinutes, targetLanguage: plan.targetLanguage, successCheck: plan.successCheck, notes: plan.notes, steps: plan.steps.map(draftStep), vocabularySources: plan.vocabularySources ?? [] });
}

export function ClassLessonEditor({
  lesson,
  archivedClass,
  studioActivities,
  liveGameSets,
  onClose,
  onSaved,
  onDuplicated,
  onArchived,
}: Props) {
  const [title, setTitle] = useState(lesson.title);
  const [objective, setObjective] = useState(lesson.objective);
  const [durationMinutes, setDurationMinutes] = useState(lesson.durationMinutes);
  const [targetLanguage, setTargetLanguage] = useState(lesson.targetLanguage);
  const [successCheck, setSuccessCheck] = useState(lesson.successCheck);
  const [notes, setNotes] = useState(lesson.notes);
  const [status, setStatus] = useState<ClassLessonStatus>(
    lesson.status === "archived" ? "draft" : lesson.status,
  );
  const [steps, setSteps] = useState<DraftStep[]>(
    lesson.steps.map(draftStep),
  );
  const [editorKind, setEditorKind] = useState<ClassLessonStepKind | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(lesson.publishedAt);
  const [isPending, startTransition] = useTransition();
  const [vocabularySources, setVocabularySources] = useState<LessonVocabularySource[]>(lesson.vocabularySources ?? []);
  const [updatedAt, setUpdatedAt] = useState(lesson.updatedAt);
  const [materialBusy, setMaterialBusy] = useState(false);
  const [releaseId, setReleaseId] = useState(lesson.releaseId ?? null);
  const [releasedAt, setReleasedAt] = useState(lesson.releasedAt ?? null);
  const [review, setReview] = useState<LessonDeliveryReview | null>(null);
  const [reviewFingerprint, setReviewFingerprint] = useState<string | null>(null);
  const [previewChecked, setPreviewChecked] = useState(false);
  const generationAttemptRef = useRef<{ operationId: string; revision: string } | null>(null);
  const busy = isPending || materialBusy;

  const usedSourceIds = steps.flatMap((step) => {
    const config = step.config as StudioActivityLessonStepConfig;
    return config.generation ? [config.generation.recipe.vocabListId] : [];
  });
  const availableActivities = useMemo(() => {
    const options = new Map(studioActivities.map((activity) => [activity.id, activity]));
    for (const step of steps) {
      if (step.kind !== "studio_activity") continue;
      const config = step.config as StudioActivityLessonStepConfig;
      options.set(config.activityId, { id: config.activityId, title: config.activityTitle, format: config.format, playPath: config.playPath });
    }
    return [...options.values()];
  }, [steps, studioActivities]);

  const preparation = lessonReadiness({ objective, successCheck, durationMinutes, steps });
  const planFingerprint = contentFingerprint({ title, objective, durationMinutes, targetLanguage, successCheck, notes, steps, vocabularySources });
  const currentReview = reviewFingerprint === planFingerprint ? review : null;

  const editingStep = editingStepId
    ? (steps.find((step) => step.id === editingStepId) ?? null)
    : null;

  const moveStep = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= steps.length) return;
    setSteps((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
    setMessage(null);
  };

  const persistPlan = async () => {
    setReview(null); setPreviewChecked(false);
    const result = await saveClassLesson({
      lessonId: lesson.id, title, notes, status, objective, durationMinutes,
      targetLanguage, successCheck, steps, vocabularySources, expectedUpdatedAt: updatedAt,
    });
    if (!result.ok) throw new Error(result.error);
    // Review the canonical saved content, including normalization, rather than
    // leaving a longer/stale local draft on screen while releasing another body.
    setTitle(result.lesson.title); setObjective(result.lesson.objective);
    setDurationMinutes(result.lesson.durationMinutes); setTargetLanguage(result.lesson.targetLanguage);
    setSuccessCheck(result.lesson.successCheck); setNotes(result.lesson.notes);
    setSteps(result.lesson.steps.map(draftStep)); setVocabularySources(result.lesson.vocabularySources ?? []);
    setUpdatedAt(result.lesson.updatedAt);
    setPublishedAt(result.lesson.publishedAt);
    onSaved(result.lesson);
    return result.lesson;
  };

  const generateMaterial: ComponentProps<typeof LessonVocabularyPanel>["onGenerate"] = async (input) => {
    setMaterialBusy(true);
    setError(null);
    setMessage(null);
    try {
      // Reuse the operation/revision after an uncertain response instead of
      // resaving a potentially stale local sequence before recovering the result.
      if (generationAttemptRef.current?.operationId !== input.operationId) {
        const saved = await persistPlan();
        generationAttemptRef.current = { operationId: input.operationId, revision: saved.updatedAt };
      }
      const result = await generateLessonVocabularyActivity({ ...input, lessonId: lesson.id, expectedUpdatedAt: generationAttemptRef.current.revision });
      if (!result.ok) throw new Error(result.error);
      setSteps(result.lesson.steps);
      setUpdatedAt(result.lesson.updatedAt);
      setVocabularySources(result.lesson.vocabularySources ?? []);
      onSaved(result.lesson);
      generationAttemptRef.current = null;
      setMessage("Material added and lesson saved. Preview it in the lesson sequence.");
    } finally {
      setMaterialBusy(false);
    }
  };

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await persistPlan();
        setMessage("Lesson plan saved.");
      } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the lesson."); }
    });
  };

  const reviewDelivery = () => {
    setError(null); setMessage(null); setPreviewChecked(false); setReview(null);
    startTransition(async () => {
      try {
        const saved = await persistPlan();
        const result = await reviewClassLessonDelivery({ lessonId: lesson.id, expectedUpdatedAt: saved.updatedAt });
        if (!result.ok) throw new Error(result.error);
        setReview(result.review); setReviewFingerprint(contentFingerprint(saved));
        setMessage(result.review.readiness.ready ? "Preparation checks passed. Preview the materials and confirm your review before releasing." : "Resolve the preparation issues, then review again.");
      } catch (error) { setError(error instanceof Error ? error.message : "Could not review lesson."); }
    });
  };

  const releaseDelivery = () => {
    if (!currentReview?.readiness.ready || !previewChecked) return;
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        const result = await releaseClassLessonDelivery({ lessonId: lesson.id, expectedUpdatedAt: currentReview.lessonUpdatedAt, materialRevisions: currentReview.materialRevisions });
        if (!result.ok) throw new Error(result.error);
        setReleaseId(result.lesson.releaseId ?? null); setReleasedAt(result.lesson.releasedAt ?? null);
        setStatus(result.lesson.status); setUpdatedAt(result.lesson.updatedAt);
        onSaved(result.lesson);
        setMessage("Reviewed lesson released for teaching. Assign homework below when you are ready.");
      } catch (error) { setError(error instanceof Error ? error.message : "Could not release the lesson. Retry after checking the plan."); }
    });
  };

  const togglePublish = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = publishedAt
        ? await unpublishClassLessonFromClassroom(lesson.id)
        : await publishClassLessonToClassroom(lesson.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPublishedAt(result.lesson.publishedAt);
      setUpdatedAt(result.lesson.updatedAt);
      setMessage(
        result.lesson.publishedAt
          ? "Lesson outline shared with students on the Classroom page."
          : "Lesson removed from student Classroom.",
      );
      onSaved(result.lesson);
    });
  };

  const archive = () => {
    if (!window.confirm(`Archive “${title.trim() || lesson.title}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveClassLesson(lesson.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onArchived(lesson.id);
    });
  };

  const duplicate = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await duplicateClassLesson(lesson.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDuplicated(result.lesson);
    });
  };

  if (editorKind) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <ClassLessonStepEditor
          step={editingStep}
          kind={editorKind}
          studioActivities={availableActivities}
          liveGameSets={liveGameSets}
          onCancel={() => {
            setEditorKind(null);
            setEditingStepId(null);
          }}
          onSave={(step) => {
            setSteps((current) => {
              const index = current.findIndex((item) => item.id === step.id);
              if (index >= 0) {
                const copy = [...current];
                copy[index] = step;
                return copy;
              }
              return [...current, step];
            });
            setMessage(null);
            setEditorKind(null);
            setEditingStepId(null);
          }}
        />
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Lesson planner
          </p>
          <h2 className="text-xl font-bold text-neutral-900">Plan the learning first</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Define the goal, sequence the learning, then connect the materials you need.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Back to lessons
        </button>
      </div>

      {lesson.courseProvenance && <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm">
        <p><strong>From course map:</strong> {lesson.courseProvenance.mapTitle} · revision {lesson.courseProvenance.revision}</p>
        <p className="text-xs text-neutral-600">This class plan is independently editable. Course changes keep this plan and its reviewed materials intact.</p>
        <Link href={`${MAP_PATH}/${lesson.courseProvenance.mapId}?lesson=${lesson.courseProvenance.plannedLessonId}&classId=${lesson.classId}`} target="_blank" className="inline-block text-xs font-semibold text-teal-900 underline">Open course lesson ↗</Link>
        {!!lesson.courseProvenance.resources.length && <details><summary className="cursor-pointer text-xs font-semibold">Course resource references</summary><ul className="mt-2 space-y-1">{lesson.courseProvenance.resources.map(resource => <li key={resource.id} className="text-xs"><a href={resourceHref(resource)} target="_blank" rel="noopener noreferrer" className="text-teal-900 underline">{resource.title || resource.kind}</a>{resource.purpose && ` — ${resource.purpose}`}</li>)}</ul><p className="mt-2 text-xs text-neutral-500">These links open current sources. Imported vocabulary is available separately in Lesson vocabulary below.</p></details>}
      </div>}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <label className="block text-sm font-semibold text-neutral-800">
          Lesson title
          <input
            type="text"
            value={title}
            disabled={archivedClass || busy}
            onChange={(event) => {
              setTitle(event.target.value);
              setMessage(null);
            }}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          Target minutes
          <input
            type="number"
            min={5}
            max={240}
            value={durationMinutes}
            disabled={archivedClass || busy}
            onChange={(event) => {
              setDurationMinutes(
                Math.min(240, Math.max(5, Number.parseInt(event.target.value, 10) || 5)),
              );
              setMessage(null);
            }}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
          />
        </label>
      </div>

      <div className="grid gap-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-neutral-800 sm:col-span-2">
          Learning goal
          <textarea
            value={objective}
            disabled={archivedClass || busy}
            onChange={(event) => {
              setObjective(event.target.value);
              setMessage(null);
            }}
            rows={2}
            placeholder="Students will be able to…"
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          Target language or vocabulary
          <textarea
            value={targetLanguage}
            disabled={archivedClass || busy}
            onChange={(event) => {
              setTargetLanguage(event.target.value);
              setMessage(null);
            }}
            rows={3}
            placeholder="Key words, sentence frames, grammar, or pronunciation focus"
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          Success check
          <textarea
            value={successCheck}
            disabled={archivedClass || busy}
            onChange={(event) => {
              setSuccessCheck(event.target.value);
              setMessage(null);
            }}
            rows={3}
            placeholder="I will know students can do this when…"
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
          />
        </label>
      </div>

      <div className="grid gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Classroom time
          </p>
          <p className="mt-1 text-lg font-bold text-neutral-900">
            {preparation.classroomMinutes} / {durationMinutes} min
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Lesson steps
          </p>
          <p className="mt-1 text-lg font-bold text-neutral-900">{steps.length}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Homework effort
          </p>
          <p className="mt-1 text-lg font-bold text-neutral-900">{preparation.homeworkMinutes} min</p>
        </div>
      </div>

      <div className="space-y-3">
        <LessonVocabularyPanel
          sources={vocabularySources}
          usedSourceIds={usedSourceIds}
          disabled={archivedClass || busy}
          full={steps.length >= 20}
          onSourcesChange={(sources) => { setVocabularySources(sources); setMessage(null); }}
          onGenerate={generateMaterial}
        />
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            Lesson sequence ({steps.length})
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Offline teaching is valid. Add a digital material only where it improves the learning.
          </p>
        </div>

        {steps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
            No steps yet. Add a teaching step or connect a material from your Activity Bank.
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    {index + 1}. {CLASS_LESSON_PHASE_LABELS[step.phase]} · {step.durationMinutes} min
                    · {CLASS_LESSON_STEP_KIND_LABELS[step.kind]}
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-900">{step.title}</p>
                  <p className="mt-1 text-xs font-semibold text-teal-900">{stepPlanning(step).delivery === "homework" ? "Homework" : "Classroom"} · {preparation.steps[index]?.ready ? "Prepared" : "Needs preparation"}</p>
                  {preparation.steps[index]?.issues.length ? <ul className="mt-1 list-disc pl-4 text-xs text-amber-900">{preparation.steps[index].issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
                  {step.studentAction ? (
                    <p className="mt-1 text-sm text-neutral-600">Students: {step.studentAction}</p>
                  ) : null}
                  {step.kind === "studio_activity" && (step.config as StudioActivityLessonStepConfig).generation ? (
                    <p className="mt-1 text-xs text-teal-900">
                      From {(step.config as StudioActivityLessonStepConfig).generation!.sourceName} · {(step.config as StudioActivityLessonStepConfig).generation!.recipe.selectedEntryIds.length} words
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {step.kind === "studio_activity" ? (
                    <>
                      <Link href={(step.config as StudioActivityLessonStepConfig).playPath} target="_blank" rel="noopener noreferrer" className="rounded border border-teal-300 px-2 py-1 text-xs font-semibold text-teal-900">Preview</Link>
                      <Link href={bankPathForStudioActivity((step.config as StudioActivityLessonStepConfig).activityId)} target="_blank" rel="noopener noreferrer" className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold">Open material</Link>
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={archivedClass || busy || index === 0}
                    onClick={() => moveStep(index, -1)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={archivedClass || busy || index === steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    disabled={archivedClass || busy}
                    onClick={() => {
                      setEditingStepId(step.id);
                      setEditorKind(step.kind);
                    }}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={archivedClass || busy}
                    onClick={() => {
                      setSteps((current) => current.filter((item) => item.id !== step.id));
                      setMessage(null);
                    }}
                    className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        {!archivedClass ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {CLASS_LESSON_STEP_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={busy || steps.length >= 20}
                onClick={() => {
                  setEditingStepId(null);
                  setEditorKind(kind);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
                  kind === "custom" || kind === "studio_activity"
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-300 bg-neutral-50 text-neutral-800 hover:bg-white"
                }`}
              >
                + {CLASS_LESSON_STEP_KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <label className="block text-sm font-semibold text-neutral-800">
        Private teacher notes <span className="font-normal text-neutral-500">(optional)</span>
        <textarea
          value={notes}
          disabled={archivedClass || busy}
          onChange={(event) => {
            setNotes(event.target.value);
            setMessage(null);
          }}
          rows={2}
          placeholder="Preparation, differentiation, or reminders that students should not see"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
        />
      </label>

      <div className="space-y-3 rounded-xl border border-teal-200 p-3">
        <h3 className="font-semibold">Review and release for teaching</h3>
        <p className="text-sm text-neutral-600">Release preserves this sequence and its flashcard/quiz materials for classroom use and homework. Later edits become the next draft. Sharing the outline and assigning homework remain separate teacher actions.</p>
        {releasedAt ? <p className="text-xs text-teal-900">A reviewed release is available for teaching. Active sessions retain the release they started with.</p> : null}
        <button type="button" disabled={archivedClass || busy} onClick={reviewDelivery} className="rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Save and check preparation</button>
        {currentReview ? <>
          <ul className="list-disc pl-5 text-sm text-amber-900">
            {currentReview.readiness.issues.map((issue) => <li key={issue}>{issue}</li>)}
            {currentReview.readiness.steps.filter((step) => !step.ready).map((step) => <li key={step.stepId}>{steps.find((item) => item.id === step.stepId)?.title}: {step.issues.join(" ")}</li>)}
          </ul>
          {currentReview.readiness.ready ? <>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={previewChecked} disabled={busy || archivedClass} onChange={(event) => setPreviewChecked(event.target.checked)} />I have previewed the materials and checked the sequence, instructions, and success criteria.</label>
            <button type="button" disabled={archivedClass || busy || !previewChecked} onClick={releaseDelivery} className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Release reviewed lesson</button>
          </> : null}
        </> : null}
        {review && !currentReview ? <p className="text-xs text-amber-900">The plan changed after review. Save and check preparation again.</p> : null}
      </div>
      {releaseId ? <LessonHomeworkPanel key={releaseId} releaseId={releaseId} disabled={archivedClass || busy} /> : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-neutral-800">Planning status</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["draft", "Draft"],
              ["ready", "Ready"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={archivedClass || busy || (value === "ready" && !releaseId)}
              onClick={() => {
                setStatus(value);
                setMessage(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                status === value
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 bg-white text-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          Release a reviewed plan to mark it Ready. Ready lessons can be selected in the Teach tab.
        </p>
      </fieldset>

      {status === "ready" && steps.length > 0 ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3">
          <p className="text-sm font-semibold text-teal-950">Student Classroom</p>
          <p className="mt-1 text-xs text-teal-900/80">
            Share only the safe lesson outline—step titles, phases, time, and student actions.
            Private notes and teacher cues remain hidden.
          </p>
          <button
            type="button"
            disabled={archivedClass || busy}
            onClick={togglePublish}
            className={`mt-3 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${
              publishedAt
                ? "border border-teal-800 bg-white text-teal-900"
                : "bg-teal-800 text-white"
            }`}
          >
            {isPending
              ? "Updating…"
              : publishedAt
                ? "Remove from Classroom"
                : "Share with class"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
        <button
          type="button"
          disabled={archivedClass || busy}
          onClick={save}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save lesson plan"}
        </button>
        <button
          type="button"
          disabled={archivedClass || busy}
          onClick={duplicate}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={archivedClass || busy}
          onClick={archive}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
        >
          Archive
        </button>
      </div>
    </section>
  );
}
