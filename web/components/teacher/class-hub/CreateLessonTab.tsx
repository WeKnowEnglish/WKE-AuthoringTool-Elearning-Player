"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClassLessonEditor } from "@/components/teacher/class-hub/ClassLessonEditor";
import {
  ClassVocabularyListsPanel,
  type ClassVocabularyListSummary,
} from "@/components/teacher/class-hub/ClassVocabularyListsPanel";
import { createClassLesson } from "@/lib/actions/class-lessons";
import {
  CLASS_LESSON_TEMPLATES,
  type ClassLessonTemplateKey,
} from "@/lib/class-lessons/templates";
import type {
  ClassLesson,
  LiveGameQuestionSetOption,
  StudioActivityOption,
} from "@/lib/class-lessons/types";

type Props = {
  classId: string;
  archived: boolean;
  lessons: ClassLesson[];
  studioActivities: StudioActivityOption[];
  liveGameSets: LiveGameQuestionSetOption[];
  vocabularyLists: ClassVocabularyListSummary[];
  initialLessonId?: string | null;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CreateLessonTab({
  classId,
  archived,
  lessons: initialLessons,
  studioActivities,
  liveGameSets,
  vocabularyLists,
  initialLessonId = null,
}: Props) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(initialLessonId);
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  useEffect(() => {
    setActiveLessonId(initialLessonId);
  }, [initialLessonId]);

  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [activeLessonId, lessons],
  );

  const createLesson = (templateKey: ClassLessonTemplateKey) => {
    setError(null);
    startTransition(async () => {
      const result = await createClassLesson({ classId, templateKey });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLessons((current) => [
        result.lesson,
        ...current.filter((item) => item.id !== result.lesson.id),
      ]);
      setActiveLessonId(result.lesson.id);
      setShowTemplates(false);
      router.replace(`/teacher/classes/${classId}?tab=lesson&lessonId=${result.lesson.id}`, {
        scroll: false,
      });
    });
  };

  if (activeLesson) {
    return (
      <ClassLessonEditor
        key={activeLesson.id}
        lesson={activeLesson}
        archivedClass={archived}
        studioActivities={studioActivities}
        liveGameSets={liveGameSets}
        onClose={() => {
          setActiveLessonId(null);
          router.replace(`/teacher/classes/${classId}?tab=lesson`, { scroll: false });
        }}
        onSaved={(lesson) => {
          setLessons((current) =>
            current.map((item) => (item.id === lesson.id ? lesson : item)),
          );
        }}
        onDuplicated={(lesson) => {
          setLessons((current) => [
            lesson,
            ...current.filter((item) => item.id !== lesson.id),
          ]);
          setActiveLessonId(lesson.id);
          router.replace(`/teacher/classes/${classId}?tab=lesson&lessonId=${lesson.id}`, {
            scroll: false,
          });
        }}
        onArchived={(lessonId) => {
          setLessons((current) => current.filter((item) => item.id !== lessonId));
          setActiveLessonId(null);
          router.replace(`/teacher/classes/${classId}?tab=lesson`, { scroll: false });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Plan lesson
        </p>
        <h2 className="mt-1 text-xl font-bold text-neutral-900">
          Build a clear, teachable lesson
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Start from a practical teaching template, add or create materials, then use the same
          sequence in Virtual Classroom.
        </p>
        {!archived ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowTemplates((current) => !current)}
            className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {showTemplates ? "Close templates" : "New lesson"}
          </button>
        ) : (
          <p className="mt-3 text-sm text-amber-800">Unarchive the class to create lessons.</p>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <ClassVocabularyListsPanel archived={archived} lists={vocabularyLists} />

      {showTemplates && !archived ? (
        <section className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Choose a starting point
          </p>
          <h3 className="mt-1 text-lg font-bold text-neutral-900">Lesson templates</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Templates create normal editable lessons. Remove, rename, or reorder any step.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CLASS_LESSON_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                disabled={isPending}
                onClick={() => createLesson(template.key)}
                className="rounded-xl border border-neutral-200 bg-white p-3 text-left transition hover:border-teal-500 disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-900">{template.name}</span>
                  {template.recommended ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-900">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  {template.description}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-neutral-500">
                  {template.steps.length || "No"} prepared step
                  {template.steps.length === 1 ? "" : "s"} · {template.durationMinutes} minutes
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {lessons.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-sm text-neutral-600">
            No lesson plans yet. Choose a template to plan the first one.
          </p>
        </section>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveLessonId(lesson.id);
                  router.replace(
                    `/teacher/classes/${classId}?tab=lesson&lessonId=${lesson.id}`,
                    { scroll: false },
                  );
                }}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-neutral-400"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-neutral-900">{lesson.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        lesson.status === "ready"
                          ? "bg-teal-100 text-teal-900"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {lesson.status === "ready" ? "Ready" : "Draft"}
                    </span>
                    {lesson.publishedAt ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                        On Classroom
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {lesson.steps.length} step{lesson.steps.length === 1 ? "" : "s"} · Updated{" "}
                    {formatUpdatedAt(lesson.updatedAt)}
                  </p>
                  {lesson.objective ? (
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                      {lesson.objective}
                    </p>
                  ) : null}
                </div>
                <span className="text-sm font-semibold text-neutral-700">Edit →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
