"use client";

import { useMemo, useState, useTransition } from "react";
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
} from "@/lib/class-lessons/types";
import {
  CLASS_LESSON_PHASE_LABELS,
  CLASS_LESSON_STEP_KIND_LABELS,
  CLASS_LESSON_STEP_KINDS,
} from "@/lib/class-lessons/types";
import { ClassLessonStepEditor } from "@/components/teacher/class-hub/ClassLessonStepEditor";

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
    lesson.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      title: step.title,
      phase: step.phase,
      durationMinutes: step.durationMinutes,
      teacherAction: step.teacherAction,
      studentAction: step.studentAction,
      config: step.config,
    })),
  );
  const [editorKind, setEditorKind] = useState<ClassLessonStepKind | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(lesson.publishedAt);
  const [isPending, startTransition] = useTransition();

  const plannedMinutes = useMemo(
    () => steps.reduce((total, step) => total + step.durationMinutes, 0),
    [steps],
  );
  const launchableMaterials = useMemo(
    () => steps.filter((step) => step.kind !== "custom").length,
    [steps],
  );

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

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveClassLesson({
        lessonId: lesson.id,
        title,
        notes,
        status,
        objective,
        durationMinutes,
        targetLanguage,
        successCheck,
        steps,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Lesson plan saved.");
      setPublishedAt(result.lesson.publishedAt);
      onSaved(result.lesson);
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
          studioActivities={studioActivities}
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
          onClick={onClose}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Back to lessons
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <label className="block text-sm font-semibold text-neutral-800">
          Lesson title
          <input
            type="text"
            value={title}
            disabled={archivedClass || isPending}
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
            disabled={archivedClass || isPending}
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
            disabled={archivedClass || isPending}
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
            disabled={archivedClass || isPending}
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
            disabled={archivedClass || isPending}
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
            Planned time
          </p>
          <p className="mt-1 text-lg font-bold text-neutral-900">
            {plannedMinutes} / {durationMinutes} min
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
            Launchable materials
          </p>
          <p className="mt-1 text-lg font-bold text-neutral-900">{launchableMaterials}</p>
        </div>
      </div>

      <div className="space-y-3">
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
                  {step.studentAction ? (
                    <p className="mt-1 text-sm text-neutral-600">Students: {step.studentAction}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={archivedClass || isPending || index === 0}
                    onClick={() => moveStep(index, -1)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={archivedClass || isPending || index === steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    disabled={archivedClass || isPending}
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
                    disabled={archivedClass || isPending}
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
                disabled={isPending || steps.length >= 20}
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
          disabled={archivedClass || isPending}
          onChange={(event) => {
            setNotes(event.target.value);
            setMessage(null);
          }}
          rows={2}
          placeholder="Preparation, differentiation, or reminders that students should not see"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
        />
      </label>

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
              disabled={archivedClass || isPending}
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
          Ready lessons can be bound when you start Virtual Classroom from the Teach tab.
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
            disabled={archivedClass || isPending}
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
          disabled={archivedClass || isPending}
          onClick={save}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save lesson plan"}
        </button>
        <button
          type="button"
          disabled={archivedClass || isPending}
          onClick={duplicate}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={archivedClass || isPending}
          onClick={archive}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
        >
          Archive
        </button>
      </div>
    </section>
  );
}
