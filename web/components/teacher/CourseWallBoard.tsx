"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CourseRow, TeacherLessonRow, TeacherModuleRow } from "@/lib/data/teacher";

type Props = {
  courses: CourseRow[];
  modules: TeacherModuleRow[];
  lessons: TeacherLessonRow[];
};

export function CourseWallBoard({ courses, modules, lessons }: Props) {
  const modulesByCourse = useMemo(() => {
    const grouped = new Map<string, TeacherModuleRow[]>();
    for (const module of modules) {
      const courseId = module.course_id;
      if (!courseId) continue;
      const list = grouped.get(courseId) ?? [];
      list.push(module);
      grouped.set(courseId, list);
    }
    return grouped;
  }, [modules]);

  const lessonsByModule = useMemo(() => {
    const grouped = new Map<string, TeacherLessonRow[]>();
    for (const lesson of lessons) {
      const list = grouped.get(lesson.module_id) ?? [];
      list.push(lesson);
      grouped.set(lesson.module_id, list);
    }
    return grouped;
  }, [lessons]);

  const [openModuleByCourse, setOpenModuleByCourse] = useState<Record<string, string | null>>({});

  return (
    <ul className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => {
        const courseModules = modulesByCourse.get(course.id) ?? [];
        const openModuleId = openModuleByCourse[course.id] ?? null;

        return (
          <li key={course.id}>
            <article className="flex h-full flex-col rounded-[2rem] border border-neutral-300 bg-[#fffde9] p-3 shadow-[0_12px_12px_rgba(0,0,0,0.45)]">
              <div className="mb-3 overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-100">
                {course.cover_video_url ? (
                  <video
                    src={course.cover_video_url}
                    muted
                    controls
                    className="aspect-video w-full bg-neutral-900 object-cover"
                  />
                ) : course.cover_image_url ? (
                  <div
                    className="aspect-video w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${course.cover_image_url}")` }}
                    aria-label={`${course.title} cover`}
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-amber-100 via-yellow-50 to-rose-100">
                    <p className="px-4 text-center text-sm font-semibold text-neutral-700">
                      Add a cover image or video in course details
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <p className="text-xl font-bold text-neutral-900">{course.title}</p>
                <p className="mt-1 text-sm text-neutral-700">
                  /{course.slug} · order {course.order_index}
                  {course.published ? "" : " · draft"}
                </p>
              </div>

              <div className="flex-1 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-700">Modules</h2>
                {courseModules.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-neutral-300 bg-white/70 px-3 py-2 text-sm text-neutral-600">
                    No modules in this course yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {courseModules.map((module) => {
                      const moduleLessons = lessonsByModule.get(module.id) ?? [];
                      const isOpen = openModuleId === module.id;
                      return (
                        <li key={module.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenModuleByCourse((prev) => ({
                                ...prev,
                                [course.id]: prev[course.id] === module.id ? null : module.id,
                              }))
                            }
                            className="flex w-full items-center justify-between rounded-xl border border-neutral-300 bg-white px-3 py-2 text-left text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
                          >
                            <span>{module.title}</span>
                            <span className="text-xs text-neutral-600">{isOpen ? "Hide lessons" : "Open lessons"}</span>
                          </button>

                          {isOpen ? (
                            <div className="mt-2 rounded-xl border border-neutral-300 bg-white/85 p-3">
                              {moduleLessons.length === 0 ? (
                                <p className="text-sm text-neutral-600">No lessons in this module.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {moduleLessons.map((lesson) => (
                                    <li key={lesson.id}>
                                      <Link
                                        prefetch={false}
                                        href={`/teacher/modules/${module.id}/lessons/${lesson.id}`}
                                        className="block rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 underline-offset-2 transition-colors hover:bg-blue-50 hover:underline"
                                      >
                                        {lesson.title}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Link
                                  prefetch={false}
                                  href={`/teacher/modules/${module.id}`}
                                  className="rounded border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-800"
                                >
                                  Edit module
                                </Link>
                                <Link
                                  prefetch={false}
                                  href={`/teacher/modules/${module.id}/lessons/new`}
                                  className="rounded bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white"
                                >
                                  + Lesson
                                </Link>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/teacher/courses/${course.id}/edit`}
                  className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800"
                >
                  Edit details
                </Link>
                <Link
                  href={`/teacher/modules/new?courseId=${course.id}`}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  + New module
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
