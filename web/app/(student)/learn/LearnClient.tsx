"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CourseRow, LessonRow, ModuleRow } from "@/lib/data/catalog";
import {
  isModuleUnlocked,
  lessonsForModule,
  modulesSorted,
} from "@/lib/gating";
import { getProgressSnapshot } from "@/lib/progress/local-storage";
import { KidPanel } from "@/components/kid-ui/KidPanel";

type Props = {
  courses: CourseRow[];
  modules: ModuleRow[];
  lessons: LessonRow[];
  skillsByLesson: Record<string, string[]>;
  moduleTagsByModule: Record<string, string[]>;
  loadError?: string;
  initialQuery: string;
  initialCourse: string;
  initialTags: string;
};

export function LearnClient({
  courses,
  modules,
  lessons,
  skillsByLesson,
  moduleTagsByModule,
  loadError,
  initialQuery,
  initialCourse,
  initialTags,
}: Props) {
  const router = useRouter();
  const snap = useMemo(() => getProgressSnapshot(), []);
  const completed = snap.completedLessonIds;

  const sortedMods = modulesSorted(modules);
  const selectedTags = initialTags
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const filteredMods = sortedMods.filter((mod) => {
    if (initialCourse && mod.course_id !== initialCourse) return false;
    if (initialQuery.trim()) {
      const course = courses.find((c) => c.id === mod.course_id);
      const haystack = [mod.title, mod.slug, course?.title ?? "", course?.target ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(initialQuery.trim().toLowerCase())) return false;
    }
    if (selectedTags.length > 0) {
      const tags = (moduleTagsByModule[mod.id] ?? []).map((t) => t.toLowerCase());
      if (!selectedTags.some((tag) => tags.includes(tag))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <form className="rounded-lg border-4 border-kid-ink bg-kid-panel p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            name="q"
            defaultValue={initialQuery}
            placeholder="Search courses or modules"
            className="rounded border-2 border-kid-ink px-3 py-2 text-sm"
          />
          <select
            name="course"
            defaultValue={initialCourse}
            className="rounded border-2 border-kid-ink px-3 py-2 text-sm"
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <input
            name="tags"
            defaultValue={initialTags}
            placeholder="Tags (e.g. speaking, grade-3)"
            className="rounded border-2 border-kid-ink px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="rounded border-2 border-kid-ink bg-kid-cta px-3 py-2 text-sm font-bold text-kid-ink"
          >
            Search
          </button>
          <Link
            href="/learn"
            className="rounded border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink"
          >
            Clear
          </Link>
        </div>
      </form>
      {loadError ? (
        <KidPanel className="border-red-800 bg-red-50">
          <p className="text-lg font-bold text-red-950">
            Could not load lessons from the database
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-red-900">
            {loadError}
          </p>
        </KidPanel>
      ) : null}
      {filteredMods.map((mod) => {
        const courseModules = sortedMods.filter((m) => m.course_id === mod.course_id);
        const unlocked = isModuleUnlocked(mod, courseModules, lessons, completed);
        const modLessons = lessonsForModule(lessons, mod.id);
        const tags = moduleTagsByModule[mod.id] ?? [];
        const course = courses.find((c) => c.id === mod.course_id);
        return (
          <KidPanel
            key={mod.id}
            className={unlocked && modLessons[0] ? "cursor-pointer" : undefined}
            onClick={() => {
              if (unlocked && modLessons[0]) {
                router.push(`/learn/${mod.slug}/${modLessons[0].slug}`);
              }
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold text-kid-ink">{mod.title}</h2>
                <p className="text-sm text-kid-ink/80">
                  {course?.title ?? "Course"} · {course?.target ?? "General"}
                  {tags.length > 0 ? ` · ${tags.join(", ")}` : ""}
                </p>
              </div>
              {!unlocked ? (
                <span className="rounded-md border-2 border-kid-ink bg-kid-surface-muted px-2 py-1 text-sm font-semibold text-kid-ink">
                  Locked
                </span>
              ) : null}
            </div>
            {!unlocked ? (
              <p className="mt-2 text-kid-ink/85">
                Complete all lessons in the previous module to unlock this one.
              </p>
            ) : (
              <>
                <div
                  className="mt-5 flex items-center gap-1 overflow-x-auto pb-2 pt-1"
                  role="list"
                  aria-label={`Lesson path for ${mod.title}`}
                >
                  {modLessons.map((les, i) => {
                    const done = completed.includes(les.id);
                    const skills = skillsByLesson[les.id] ?? [];
                    return (
                      <div key={les.id} className="flex items-center" role="listitem">
                        {i > 0 ? (
                          <span
                            className="mx-0.5 h-1 w-5 shrink-0 rounded-full bg-kid-ink/20"
                            aria-hidden
                          />
                        ) : null}
                        <Link
                          href={`/learn/${mod.slug}/${les.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title={`${les.title}${skills.length ? ` · ${skills.join(", ")}` : ""}${done ? " · Done" : ""}`}
                          className={clsx(
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 text-lg font-extrabold transition-[transform,background-color,filter] duration-100 [touch-action:manipulation] motion-reduce:transition-none",
                            done
                              ? "border-kid-ink bg-kid-cta text-kid-ink hover:scale-105"
                              : "border-kid-ink/35 bg-kid-panel text-kid-ink/70 grayscale hover:scale-105 hover:border-kid-ink hover:grayscale-0",
                          )}
                        >
                          {i + 1}
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <ul className="mt-4 space-y-3">
                  {modLessons.map((les) => {
                    const done = completed.includes(les.id);
                    const skills = skillsByLesson[les.id] ?? [];
                    return (
                      <li key={`${les.id}-row`}>
                        <Link
                          href={`/learn/${mod.slug}/${les.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-4 border-kid-ink bg-kid-panel px-4 py-4 text-lg font-semibold text-kid-ink transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] active:bg-kid-surface motion-reduce:transition-none motion-reduce:active:scale-100"
                        >
                          <span>{les.title}</span>
                          <span className="text-sm font-bold text-kid-ink/70">
                            {done ? "Done" : "Open"}
                            {skills.length > 0 ? ` · ${skills.join(", ")}` : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </KidPanel>
        );
      })}
      {filteredMods.length === 0 ? (
        <KidPanel>
          <p className="text-kid-ink">No courses or modules match your search yet.</p>
        </KidPanel>
      ) : null}
    </div>
  );
}
