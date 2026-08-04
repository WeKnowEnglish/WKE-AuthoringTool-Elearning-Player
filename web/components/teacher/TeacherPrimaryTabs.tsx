"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { TeacherTier } from "@/lib/auth/roles";
import { beginLiveGameDiagnosticJourney } from "@/lib/live-game/diagnostics/client";
import {
  TeacherNavDropdown,
  TeacherNavMenuLink,
} from "@/components/teacher/TeacherNavDropdown";

type Props = {
  teacherTier?: TeacherTier;
  isAdmin?: boolean;
};

export function TeacherPrimaryTabs({ teacherTier = "plus", isAdmin = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLight = teacherTier === "light";
  const onWallTab = searchParams.get("space") === "1";

  const onClassroom = pathname.startsWith("/teacher/classes");
  const onActivityBuilder = pathname.startsWith("/teacher/activity-builder");
  const onMedia =
    pathname.startsWith("/teacher/media") ||
    pathname.startsWith("/teacher/dictionary") ||
    pathname.startsWith("/teacher/grammar");
  const onComicMedia = pathname.startsWith("/teacher/media/comic");
  const onGoLive =
    pathname.startsWith("/teacher/virtual-classroom") ||
    pathname.startsWith("/live-game");
  const onAdmin = pathname.startsWith("/teacher/admin");

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5"
      aria-label="Teacher primary"
    >
      <TeacherNavDropdown label="Classroom" active={onClassroom}>
        <TeacherNavMenuLink href="/teacher/classes" active={onClassroom && !onWallTab}>
          Private classes
        </TeacherNavMenuLink>
        <TeacherNavMenuLink
          href="/teacher/classes?space=1"
          active={onClassroom && onWallTab}
        >
          Classroom Wall
        </TeacherNavMenuLink>
      </TeacherNavDropdown>

      <TeacherNavDropdown label="Activity Builder" active={onActivityBuilder}>
        <TeacherNavMenuLink
          href="/teacher/activity-builder/library"
          active={pathname.startsWith("/teacher/activity-builder/library")}
        >
          WKE Library
        </TeacherNavMenuLink>
        <TeacherNavMenuLink
          href="/teacher/activity-builder/tracks"
          active={
            pathname.startsWith("/teacher/activity-builder/tracks") ||
            pathname.startsWith("/teacher/activity-builder/learning-tracks")
          }
        >
          Track builder
        </TeacherNavMenuLink>
        <TeacherNavMenuLink
          href="/teacher/activity-builder/vocabulary-lists"
          active={pathname.startsWith("/teacher/activity-builder/vocabulary-lists")}
        >
          Vocabulary lists
        </TeacherNavMenuLink>
        <TeacherNavMenuLink
          href="/teacher/activity-builder/quizzes"
          active={pathname.startsWith("/teacher/activity-builder/quizzes")}
        >
          Quiz builder
        </TeacherNavMenuLink>
        <TeacherNavMenuLink
          href="/teacher/activity-builder/hotspots"
          active={pathname.startsWith("/teacher/activity-builder/hotspots")}
        >
          Hotspots
        </TeacherNavMenuLink>
        <TeacherNavMenuLink
          href="/teacher/activity-builder"
          active={
            onActivityBuilder &&
            !pathname.startsWith("/teacher/activity-builder/tracks") &&
            !pathname.startsWith("/teacher/activity-builder/learning-tracks") &&
            !pathname.startsWith("/teacher/activity-builder/vocabulary-lists") &&
            !pathname.startsWith("/teacher/activity-builder/quizzes") &&
            !pathname.startsWith("/teacher/activity-builder/hotspots") &&
            !pathname.startsWith("/teacher/activity-builder/library")
          }
        >
          Single quiz / activity
        </TeacherNavMenuLink>
      </TeacherNavDropdown>

      <TeacherNavDropdown label="Media" active={onMedia}>
        <TeacherNavMenuLink
          href="/teacher/media"
          active={pathname.startsWith("/teacher/media") && !onComicMedia}
        >
          Asset Library
        </TeacherNavMenuLink>
        {isAdmin ? (
          <TeacherNavMenuLink href="/teacher/media/comic" active={onComicMedia}>
            WKE Comic
          </TeacherNavMenuLink>
        ) : null}
        {!isLight ? (
          <TeacherNavMenuLink
            href="/teacher/dictionary/review"
            active={pathname.startsWith("/teacher/dictionary")}
          >
            Lexicon review
          </TeacherNavMenuLink>
        ) : null}
        <TeacherNavMenuLink
          href="/teacher/grammar"
          active={pathname.startsWith("/teacher/grammar")}
        >
          Grammar posters
        </TeacherNavMenuLink>
      </TeacherNavDropdown>

      {!isLight ? (
        <TeacherNavDropdown label="Go live" active={onGoLive}>
          <TeacherNavMenuLink
            href="/teacher/virtual-classroom/host"
            active={pathname.startsWith("/teacher/virtual-classroom")}
          >
            Virtual classroom
          </TeacherNavMenuLink>
          <TeacherNavMenuLink
            href="/live-game/host"
            onClick={() => beginLiveGameDiagnosticJourney("teacher_primary_tabs")}
            active={pathname.startsWith("/live-game")}
          >
            Live game
          </TeacherNavMenuLink>
        </TeacherNavDropdown>
      ) : null}

      {isAdmin ? (
        <Link
          href="/teacher/admin"
          className="teacher-tab rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm"
          data-active={onAdmin ? "true" : "false"}
        >
          Admin
        </Link>
      ) : null}
    </nav>
  );
}
