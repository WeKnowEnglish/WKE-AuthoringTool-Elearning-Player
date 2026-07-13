"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TeacherPrimaryTabs() {
  const pathname = usePathname();
  const onClasses = pathname.startsWith("/teacher/classes");
  const onMedia = pathname.startsWith("/teacher/media");
  const onGrammar = pathname.startsWith("/teacher/grammar");

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
        href="/live-game/host"
        className="rounded-full border border-emerald-700 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 sm:px-2.5 sm:py-1.5 sm:text-sm"
      >
        Live Game
      </Link>
    </nav>
  );
}
