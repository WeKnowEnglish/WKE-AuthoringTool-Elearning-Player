"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TeacherPrimaryTabs() {
  const pathname = usePathname();
  const onActivities = pathname.startsWith("/teacher/activities");
  const onMedia = pathname.startsWith("/teacher/media");
  const onCourses = !onActivities && !onMedia;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
      <Link
        href="/teacher/courses"
        className={`rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm ${
          onCourses ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        Course Generator
      </Link>
      <Link
        href="/teacher/activities"
        className={`rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm ${
          onActivities ?
            "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        Activity Library
      </Link>
      <Link
        href="/teacher/media"
        className={`rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm ${
          onMedia ?
            "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        Media Library
      </Link>
    </nav>
  );
}
