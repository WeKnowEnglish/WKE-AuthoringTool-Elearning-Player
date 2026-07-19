"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { beginLiveGameDiagnosticJourney } from "@/lib/live-game/diagnostics/client";

export function TeacherPrimaryTabs() {
  const pathname = usePathname();
  const onClasses = pathname.startsWith("/teacher/classes");
  const onMedia = pathname.startsWith("/teacher/media");
  const onGrammar = pathname.startsWith("/teacher/grammar");
  const onVirtualClassroom = pathname.startsWith("/teacher/virtual-classroom");

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
      <Link
        href="/teacher/classes"
        className={`rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm ${
          onClasses ?
            "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        Classes
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
      <Link
        href="/teacher/grammar"
        className={`rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm ${
          onGrammar ?
            "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        Grammar Posters
      </Link>
      <Link
        href="/teacher/virtual-classroom/host"
        className={`rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm ${
          onVirtualClassroom ?
            "border-teal-900 bg-teal-900 text-white"
          : "border-teal-700 bg-teal-50 text-teal-900 hover:bg-teal-100"
        }`}
      >
        Virtual Classroom
      </Link>
      <Link
        href="/live-game/host"
        onClick={() => beginLiveGameDiagnosticJourney("teacher_primary_tabs")}
        className="rounded-full border border-emerald-700 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 sm:px-2.5 sm:py-1.5 sm:text-sm"
      >
        Live Game
      </Link>
    </nav>
  );
}
