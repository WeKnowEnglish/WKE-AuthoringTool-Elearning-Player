"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClassLesson } from "@/lib/actions/class-lessons";
import type { ClassLesson, LiveGameQuestionSetOption } from "@/lib/class-lessons/types";
import { ClassLessonEditor } from "@/components/teacher/class-hub/ClassLessonEditor";

type Props = {
  classId: string;
  archived: boolean;
  lessons: ClassLesson[];
  liveGameSets: LiveGameQuestionSetOption[];
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
  liveGameSets,
  initialLessonId = null,
}: Props) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(initialLessonId);
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

  const createLesson = () => {
    setError(null);
    startTransition(async () => {
      const result = await createClassLesson({ classId, title: "Untitled lesson" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLessons((current) => [result.lesson, ...current.filter((item) => item.id !== result.lesson.id)]);
      setActiveLessonId(result.lesson.id);
      router.replace(`/teacher/classes/${classId}?tab=lesson&lessonId=${result.lesson.id}`, {
        scroll: false,
      });
    });
  };

  if (activeLesson) {
    return (
      <ClassLessonEditor
        lesson={activeLesson}
        archivedClass={archived}
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
          Create lesson
        </p>
        <h2 className="mt-1 text-xl font-bold text-neutral-900">Stage activities before class</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Build a short playlist — whiteboard, document, word cards, live game — then launch each
          step live from Virtual Classroom.
        </p>
        {!archived ? (
          <button
            type="button"
            disabled={isPending}
            onClick={createLesson}
            className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Creating…" : "New lesson"}
          </button>
        ) : (
          <p className="mt-3 text-sm text-amber-800">Unarchive the class to create lessons.</p>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      {lessons.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-sm text-neutral-600">
            No lessons yet. Create one to start staging today’s activities.
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
                <div>
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
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {lesson.steps.length} step{lesson.steps.length === 1 ? "" : "s"}
                    {" · "}
                    Updated {formatUpdatedAt(lesson.updatedAt)}
                  </p>
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
