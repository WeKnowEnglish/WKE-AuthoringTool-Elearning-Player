"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import type { CourseRow, LessonRow, ModuleRow } from "@/lib/data/catalog";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { getProgressSnapshot, isEnrolledInCourse } from "@/lib/progress/local-storage";
import { isModuleUnlocked, lessonsForModule, modulesSorted } from "@/lib/gating";

type Props = {
  course: CourseRow;
  modules: ModuleRow[];
  lessons: LessonRow[];
  skillsByLesson: Record<string, string[]>;
  moduleTagsByModule: Record<string, string[]>;
  loadError?: string;
};

export function CourseLearnClient({
  course,
  modules,
  lessons,
  skillsByLesson,
  moduleTagsByModule,
  loadError,
}: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState<string[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  useEffect(() => {
    const snap = getProgressSnapshot();
    setCompleted(snap.completedLessonIds);
    setEnrolled(isEnrolledInCourse(course.id));
  }, [course.id]);
  const sortedMods = modulesSorted(modules);

  return (
    <div className="space-y-6">
      {!enrolled ? (
        <KidPanel className="border-amber-300 bg-amber-50">
          <p className="font-bold text-amber-950">You are not enrolled in this course yet.</p>
          <div className="mt-2">
            <Link href="/learn" className="text-sm font-semibold text-amber-900 underline">
              Go back to courses and enroll
            </Link>
          </div>
        </KidPanel>
      ) : null}
      {loadError ? (
        <KidPanel className="border-red-800 bg-red-50">
          <p className="text-lg font-bold text-red-950">
            Could not load lessons from the database
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-red-900">{loadError}</p>
        </KidPanel>
      ) : null}
      {enrolled ?
        sortedMods.map((mod) => {
          const courseModules = sortedMods.filter((m) => m.course_id === mod.course_id);
          const unlocked = isModuleUnlocked(mod, courseModules, lessons, completed);
          const modLessons = lessonsForModule(lessons, mod.id);
          const tags = moduleTagsByModule[mod.id] ?? [];
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
                    {course.title}
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
                <ul className="mt-4 space-y-3">
                  {modLessons.map((les) => {
                    const done = completed.includes(les.id);
                    const skills = skillsByLesson[les.id] ?? [];
                    return (
                      <li key={`${les.id}-row`}>
                        <Link
                          href={`/learn/${mod.slug}/${les.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className={clsx(
                            "flex flex-wrap items-center justify-between gap-2 rounded-lg border-4 border-kid-ink px-4 py-4 text-lg font-semibold text-kid-ink transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] motion-reduce:transition-none motion-reduce:active:scale-100",
                            done ?
                              "bg-kid-cta active:scale-[0.98] active:bg-kid-surface"
                            : "bg-kid-panel hover:bg-kid-surface-muted active:scale-[0.98] active:bg-kid-surface",
                          )}
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
              )}
            </KidPanel>
          );
        })
      : null}
    </div>
  );
}
