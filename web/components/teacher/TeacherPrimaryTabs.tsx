"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TeacherTier } from "@/lib/auth/roles";
import { beginLiveGameDiagnosticJourney } from "@/lib/live-game/diagnostics/client";

type Props = {
  teacherTier?: TeacherTier;
  isAdmin?: boolean;
};

export function TeacherPrimaryTabs({ teacherTier = "plus", isAdmin = false }: Props) {
  const pathname = usePathname();
  const onClasses = pathname.startsWith("/teacher/classes");
  const onWordPacks = pathname.startsWith("/teacher/word-packs");
  const onDictionaryReview = pathname.startsWith("/teacher/dictionary");
  const onMedia = pathname.startsWith("/teacher/media");
  const onGrammar = pathname.startsWith("/teacher/grammar");
  const onVirtualClassroom = pathname.startsWith("/teacher/virtual-classroom");
  const onAdmin = pathname.startsWith("/teacher/admin");
  const isLight = teacherTier === "light";

  const tabClass = (
    active: boolean,
    variant: "default" | "teal" | "emerald" | "admin" = "default",
  ) => {
    if (variant === "teal") {
      return active
        ? "rounded-full border border-teal-900 bg-teal-900 px-2 py-1 text-xs font-semibold text-white sm:px-2.5 sm:py-1.5 sm:text-sm"
        : "rounded-full border border-teal-700 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-100 sm:px-2.5 sm:py-1.5 sm:text-sm";
    }
    if (variant === "emerald") {
      return "rounded-full border border-emerald-700 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 sm:px-2.5 sm:py-1.5 sm:text-sm";
    }
    if (variant === "admin") {
      return active
        ? "rounded-full border border-amber-900 bg-amber-900 px-2 py-1 text-xs font-semibold text-white sm:px-2.5 sm:py-1.5 sm:text-sm"
        : "rounded-full border border-amber-700 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100 sm:px-2.5 sm:py-1.5 sm:text-sm";
    }
    return active
      ? "rounded-full border border-neutral-900 bg-neutral-900 px-2 py-1 text-xs font-semibold text-white sm:px-2.5 sm:py-1.5 sm:text-sm"
      : "rounded-full border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 sm:px-2.5 sm:py-1.5 sm:text-sm";
  };

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
      <Link href="/teacher/classes" className={tabClass(onClasses)}>
        Classes
      </Link>
      <Link href="/teacher/word-packs" className={tabClass(onWordPacks)}>
        Word packs
      </Link>
      {!isLight ? (
        <Link href="/teacher/dictionary/review" className={tabClass(onDictionaryReview)}>
          Lexicon review
        </Link>
      ) : null}
      <Link href="/teacher/media" className={tabClass(onMedia)}>
        Media Library
      </Link>
      <Link href="/teacher/grammar" className={tabClass(onGrammar)}>
        Grammar Posters
      </Link>
      {!isLight ? (
        <Link href="/teacher/virtual-classroom/host" className={tabClass(onVirtualClassroom, "teal")}>
          Virtual Classroom
        </Link>
      ) : null}
      {!isLight ? (
        <Link
          href="/live-game/host"
          onClick={() => beginLiveGameDiagnosticJourney("teacher_primary_tabs")}
          className={tabClass(false, "emerald")}
        >
          Live Game
        </Link>
      ) : null}
      {isAdmin ? (
        <Link href="/teacher/admin" className={tabClass(onAdmin, "admin")}>
          Admin
        </Link>
      ) : null}
    </nav>
  );
}
