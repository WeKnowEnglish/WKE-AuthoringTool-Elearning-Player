"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseRow } from "@/lib/data/catalog";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { enrollInCourse, getEnrolledCourseIds } from "@/lib/progress/local-storage";

type Props = {
  courses: CourseRow[];
  loadError?: string;
};

export function CourseSelectionClient({ courses, loadError }: Props) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState<string[]>([]);
  useEffect(() => {
    setEnrolled(getEnrolledCourseIds());
  }, []);
  const enrolledSet = useMemo(() => new Set(enrolled), [enrolled]);

  return (
    <div className="space-y-6">
      {loadError ? (
        <KidPanel className="border-red-800 bg-red-50">
          <p className="text-lg font-bold text-red-950">Could not load courses</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-red-900">{loadError}</p>
        </KidPanel>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const isEnrolled = enrolledSet.has(course.id);
          return (
            <KidPanel
              key={course.id}
              className="cursor-pointer"
              onClick={() => router.push(`/learn/course/${course.slug}`)}
            >
              <h2 className="text-xl font-bold text-kid-ink">{course.title}</h2>
              <p className="mt-1 text-sm text-kid-ink/80">Target: {course.target}</p>
              <div className="mt-4 flex gap-2">
                {!isEnrolled ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      enrollInCourse(course.id);
                      setEnrolled(getEnrolledCourseIds());
                    }}
                    className="rounded border-2 border-kid-ink bg-kid-cta px-3 py-2 text-sm font-bold text-kid-ink"
                  >
                    Enroll
                  </button>
                ) : null}
                <Link
                  href={`/learn/course/${course.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink"
                >
                  {isEnrolled ? "Open course" : "Preview"}
                </Link>
              </div>
            </KidPanel>
          );
        })}
      </div>
      {courses.length === 0 ? (
        <KidPanel>
          <p className="text-kid-ink">No published courses are available yet.</p>
        </KidPanel>
      ) : null}
    </div>
  );
}
