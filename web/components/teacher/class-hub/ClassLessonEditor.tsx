"use client";

import { useEffect, useState, useTransition } from "react";
import { archiveClassLesson, publishClassLessonToClassroom, saveClassLesson, unpublishClassLessonFromClassroom } from "@/lib/actions/class-lessons";
import type {
  ClassLesson,
  ClassLessonStep,
  ClassLessonStepKind,
  ClassLessonStatus,
  LiveGameQuestionSetOption,
} from "@/lib/class-lessons/types";
import { CLASS_LESSON_STEP_KIND_LABELS, CLASS_LESSON_STEP_KINDS } from "@/lib/class-lessons/types";
import { ClassLessonStepEditor } from "@/components/teacher/class-hub/ClassLessonStepEditor";

type Props = {
  lesson: ClassLesson;
  archivedClass: boolean;
  liveGameSets: LiveGameQuestionSetOption[];
  onClose: () => void;
  onSaved: (lesson: ClassLesson) => void;
  onArchived: (lessonId: string) => void;
};

type DraftStep = Omit<ClassLessonStep, "position">;

export function ClassLessonEditor({
  lesson,
  archivedClass,
  liveGameSets,
  onClose,
  onSaved,
  onArchived,
}: Props) {
  const [title, setTitle] = useState(lesson.title);
  const [notes, setNotes] = useState(lesson.notes);
  const [status, setStatus] = useState<ClassLessonStatus>(
    lesson.status === "archived" ? "draft" : lesson.status,
  );
  const [steps, setSteps] = useState<DraftStep[]>(
    lesson.steps.map(({ position: _position, ...step }) => step),
  );
  const [editorKind, setEditorKind] = useState<ClassLessonStepKind | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(lesson.publishedAt);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPublishedAt(lesson.publishedAt);
  }, [lesson.id, lesson.publishedAt]);

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
        steps,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Lesson saved.");
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
          ? "Lesson shared with students on the Classroom page."
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

  if (editorKind) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <ClassLessonStepEditor
          step={editingStep}
          kind={editorKind}
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
            setEditorKind(null);
            setEditingStepId(null);
          }}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Edit lesson
          </p>
          <h2 className="text-xl font-bold text-neutral-900">Stage your playlist</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Back to lessons
        </button>
      </div>

      <label className="block text-sm font-semibold text-neutral-800">
        Lesson title
        <input
          type="text"
          value={title}
          disabled={archivedClass || isPending}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="block text-sm font-semibold text-neutral-800">
        Teacher notes
        <textarea
          value={notes}
          disabled={archivedClass || isPending}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          placeholder="Optional prep notes (only you see these)"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-neutral-800">Status</legend>
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
              onClick={() => setStatus(value)}
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
          {publishedAt ? " This lesson is visible on the student Classroom." : null}
        </p>
      </fieldset>

      {status === "ready" && steps.length > 0 ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3">
          <p className="text-sm font-semibold text-teal-950">Student Classroom</p>
          <p className="mt-1 text-xs text-teal-900/80">
            Share this lesson on the private Classroom noticeboard so enrolled students can see the
            activity outline before or after class.
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

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-neutral-900">
            Steps ({steps.length})
          </h3>
        </div>

        {steps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
            No steps yet. Add whiteboard, document, word cards, or a live game.
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {index + 1}. {CLASS_LESSON_STEP_KIND_LABELS[step.kind]}
                  </p>
                  <p className="font-semibold text-neutral-900">{step.title}</p>
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
                    onClick={() =>
                      setSteps((current) => current.filter((item) => item.id !== step.id))
                    }
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
                className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-white disabled:opacity-50"
              >
                + {CLASS_LESSON_STEP_KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
        <button
          type="button"
          disabled={archivedClass || isPending}
          onClick={save}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save lesson"}
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
