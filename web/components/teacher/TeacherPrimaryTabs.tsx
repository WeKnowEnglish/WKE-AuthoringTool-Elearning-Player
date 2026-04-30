"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TeacherPrimaryTabs() {
  const pathname = usePathname();
  const onActivities = pathname.startsWith("/teacher/activities");
  const onMedia = pathname.startsWith("/teacher/media");
  const onCourses = !onActivities && !onMedia;

  return (
    <nav className="flex items-center justify-center gap-2">
      <Link
        href="/teacher/courses"
        className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
          onCourses ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        Course Generator
      </Link>
      <Link
        href="/teacher/activities"
        className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
          onActivities ?
            "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        Activity Library
      </Link>
      <Link
        href="/teacher/media"
        className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
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
