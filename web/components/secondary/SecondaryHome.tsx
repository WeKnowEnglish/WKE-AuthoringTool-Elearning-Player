"use client";

import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import { dailyMasteryGoalProgressFromSession } from "@/lib/secondary/secondary-daily-mastery-goal";
import {
  buildSecondaryActivityAvailabilityCounts,
  isSecondaryActivityAvailableToday,
  resolveSecondaryNextActivityKey,
  SECONDARY_ACTIVITY_HREF,
} from "@/lib/secondary/secondary-study-activity";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { SecondaryVocabProgressCard } from "@/components/secondary/SecondaryVocabProgressCard";
import { SecondaryActivityCardActions } from "@/components/secondary/SecondaryActivityCardActions";
import { SecondaryHomeIcon } from "@/components/secondary/SecondaryHomeIcon";
import {
  getSecondaryActivityIconUrl,
  getSecondaryHomeCompleteIconUrl,
  getSecondaryHomeNextIconUrl,
} from "@/lib/secondary/secondary-activity-icons";
import { hasSecondaryActivityAttempt } from "@/lib/secondary/secondary-activity-attempt-snapshot";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import { TodaysLearningAssignments } from "@/components/primary/TodaysLearningAssignments";
import { ClassroomLiveNowJoin } from "@/components/classroom/ClassroomLiveNowJoin";
import { StudentLiveNowStrip } from "@/components/classroom/StudentLiveNowStrip";
import {
  readActiveStudentClassId,
  subscribeActiveStudentClassId,
} from "@/lib/student-classes/active-class";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

const ACTIVITIES = [
  {
    key: "match" as const,
    step: 1,
    href: "/secondary/match",
    title: "1. Match",
    shortTitle: "Match",
    description: "Pair each word with the best definition.",
  },
  {
    key: "cloze" as const,
    step: 2,
    href: "/secondary/cloze",
    title: "2. Cloze",
    shortTitle: "Cloze",
    description: "Fill each blank in today's paragraph.",
  },
  {
    key: "spelling" as const,
    step: 3,
    href: "/secondary/spelling",
    title: "3. Spelling",
    shortTitle: "Spelling",
    description: "Type the correct spelling from meaning prompts.",
  },
  {
    key: "sentence" as const,
    step: 4,
    href: "/secondary/sentence",
    title: "4. Sentence",
    shortTitle: "Sentence",
    description: "Write a sentence with 5 vocabulary words for your teacher to review.",
  },
];

type Props = {
  classMemberships?: StudentClassMembership[];
  liveSessions?: StudentClassLiveSession[];
  assignedHomework?: StudentHomeworkCard[];
};

export function SecondaryHome({
  classMemberships = [],
  liveSessions = [],
  assignedHomework = [],
}: Props) {
  const { todaySession, completion, hydrated, sessionRevision } = useSecondaryTodaySession();
  const { displayName, ready: nameReady } = useStudentDisplayName();
  const activeClassId = useSyncExternalStore(
    subscribeActiveStudentClassId,
    readActiveStudentClassId,
    () => null,
  );

  const activeClass =
    (activeClassId
      ? classMemberships.find((membership) => membership.classId === activeClassId)
      : null) ??
    classMemberships[0] ??
    null;

  const activeClassLive = activeClass
    ? liveSessions.find((session) => session.classId === activeClass.classId)
    : null;

  const sessionWordIds = todaySession?.allWordItemIds ?? [];
  const studentId = resolveSecondaryStudentId();
  const dateKey = todaySession?.dateKey ?? "";

  const studyCtx = useMemo(
    () => ({
      sessionWordIds,
      dateKey,
      studentId,
      completion,
    }),
    [sessionWordIds, dateKey, studentId, completion],
  );

  const availabilityCounts = useMemo(
    () => buildSecondaryActivityAvailabilityCounts(studyCtx),
    [studyCtx],
  );

  const hasWordsToday = availabilityCounts.hasWordsToday;

  const isActivityAvailableToday = (activityKey: SecondaryTodayActivityKey) =>
    isSecondaryActivityAvailableToday(activityKey, availabilityCounts);

  const dailyGoalProgress = useMemo(() => {
    if (!todaySession) {
      return { masteredCount: 0, goal: 10, remainingCount: 10, goalReached: false };
    }
    return dailyMasteryGoalProgressFromSession(todaySession, getSecondaryWordDisplaySnapshot);
  }, [todaySession, sessionRevision]);

  const nextActivityKey = resolveSecondaryNextActivityKey(studyCtx);

  const allDoneToday =
    hydrated &&
    hasWordsToday &&
    !nextActivityKey &&
    ACTIVITIES.some((a) => isActivityAvailableToday(a.key));

  const nextActivityLabel = (() => {
    if (nextActivityKey) {
      return ACTIVITIES.find((a) => a.key === nextActivityKey)?.shortTitle ?? nextActivityKey;
    }
    if (allDoneToday) return "today's review";
    return null;
  })();

  const welcomeReady = hydrated && nameReady;

  return (
    <section className="space-y-4">
      <header className="rounded-xl border-2 border-kid-ink bg-white p-5">
        {!welcomeReady ? (
          <div className="h-8 w-full max-w-xl animate-pulse rounded-lg bg-kid-panel/80" aria-hidden />
        ) : (
          <>
            <h2 className={secondaryUi.pageTitle}>
              Welcome back{displayName ? `, ${displayName}` : ""}.
              {nextActivityLabel ? (
                <>
                  {" "}
                  Let&apos;s get to work on{" "}
                  {nextActivityKey ? (
                    <Link
                      className="underline decoration-2 underline-offset-2"
                      href={SECONDARY_ACTIVITY_HREF[nextActivityKey]}
                    >
                      {nextActivityLabel}
                    </Link>
                  ) : (
                    <span>{nextActivityLabel}</span>
                  )}
                  .
                </>
              ) : !hasWordsToday ? (
                <> Check back when today&apos;s words are ready.</>
              ) : null}
            </h2>
          </>
        )}
      </header>

      <StudentLiveNowStrip
        sessions={liveSessions}
        tone="secondary"
        learningBand="a2"
      />

      <TodaysLearningAssignments
        enrolled={classMemberships.length > 0}
        items={assignedHomework}
        tone="secondary"
        homeworkPathPrefix="/secondary/homework"
      />

      {activeClass ? (
        <div className="rounded-xl border-2 border-neutral-800 bg-white p-4">
          <p className={secondaryUi.cardTitle}>{activeClass.title}</p>
          <p className={`mt-1 ${secondaryUi.bodyMuted}`}>
            {activeClassLive
              ? "Your class is live right now — join below or open the classroom."
              : "Open your classroom for teacher posts and live lessons."}
          </p>
          {activeClassLive ? (
            <div className="mt-3 space-y-2">
              <ClassroomLiveNowJoin session={activeClassLive} tone="secondary" compact />
            </div>
          ) : null}
          <Link
            href={`/secondary/class/${encodeURIComponent(activeClass.classId)}`}
            className={`${activeClassLive ? "mt-2" : "mt-3"} inline-flex ${secondaryUi.btnPrimary}`}
          >
            Open classroom
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-neutral-400 bg-white p-4">
          <p className={secondaryUi.cardTitle}>Join your class</p>
          <p className={`mt-1 ${secondaryUi.bodyMuted}`}>
            Enter your teacher&apos;s class code so you can see assignments and live lessons.
          </p>
          <Link
            href="/join-class"
            className="mt-3 inline-flex rounded-md border-2 border-neutral-900 bg-white px-3 py-1.5 text-sm font-bold"
          >
            Join a class
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {!hydrated ? (
          <div
            className="h-24 animate-pulse rounded-xl border-2 border-kid-ink/30 bg-white/70"
            aria-hidden
          />
        ) : !hasWordsToday ? (
          <div className="rounded-xl border-2 border-amber-700 bg-amber-50 p-4">
            <p className={`${secondaryUi.cardTitle} text-amber-950`}>No words ready today</p>
            <p className={`mt-1 ${secondaryUi.bodyMuted} text-amber-900/80`}>
              Nothing ready today. Check back tomorrow, or ask your teacher.
            </p>
          </div>
        ) : (
          <div
            className={
              nextActivityKey || allDoneToday ?
                "grid gap-4 lg:grid-cols-2 lg:items-stretch"
              : "grid gap-4"
            }
          >
            <SecondaryVocabProgressCard
              masteredCount={dailyGoalProgress.masteredCount}
              goal={dailyGoalProgress.goal}
            />

            {nextActivityKey ? (
              <div className="flex flex-col rounded-xl border-2 border-kid-ink bg-kid-panel p-4">
                <div className="flex flex-1 items-start gap-3">
                  <SecondaryHomeIcon src={getSecondaryHomeNextIconUrl()} size="md" />
                  <p className={secondaryUi.cardTitle}>
                    Next up:{" "}
                    {ACTIVITIES.find((a) => a.key === nextActivityKey)?.shortTitle ?? nextActivityKey}
                  </p>
                </div>
                <Link
                  className={`mt-3 inline-flex w-fit ${secondaryUi.btnPrimary}`}
                  href={SECONDARY_ACTIVITY_HREF[nextActivityKey]}
                >
                  Continue
                </Link>
              </div>
            ) : allDoneToday ? (
              <div className="flex flex-col rounded-xl border-2 border-emerald-800 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <SecondaryHomeIcon src={getSecondaryHomeCompleteIconUrl()} size="md" />
                  <p className={`${secondaryUi.cardTitle} text-emerald-950`}>
                    Today&apos;s path is complete
                  </p>
                </div>
                <p className={`mt-2 flex-1 ${secondaryUi.bodyMuted} text-emerald-900/80`}>
                  Nice work. Replay any activity to keep building, or come back tomorrow for a fresh set.
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIVITIES.map((activity) => {
            const canOpen = isActivityAvailableToday(activity.key);
            const activityCompletion = completion[activity.key];
            const hasAttempt = hasSecondaryActivityAttempt(
              activity.key,
              studentId,
              dateKey,
              Boolean(activityCompletion?.completed),
            );
            const isNext = nextActivityKey === activity.key;
            const status = activityCompletion
              ? activity.key === "sentence"
                ? `Sent for review (${activityCompletion.percent}%)`
                : `Completed (${activityCompletion.percent}%)`
              : !hydrated
                ? "Loading…"
                : canOpen
                  ? isNext
                    ? "Up next"
                    : "Ready"
                  : activity.key === "cloze"
                    ? "Needs example sentences"
                    : activity.key === "sentence"
                      ? "Needs sentence prompts"
                      : "Not available today";

            return (
              <article
                className={`rounded-xl border-2 border-kid-ink bg-white p-4 ${
                  isNext ? "!border-kid-accent" : ""
                }`}
                key={activity.href}
              >
                <div className="flex items-start gap-3">
                  <SecondaryHomeIcon src={getSecondaryActivityIconUrl(activity.key)} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className={secondaryUi.cardTitle}>{activity.title}</h3>
                    <p className={`mt-1 ${secondaryUi.captionMuted}`}>{activity.description}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <span className={`${secondaryUi.caption} font-bold`}>{status}</span>
                  {canOpen ? (
                    <SecondaryActivityCardActions
                      activityKey={activity.key}
                      hasAttempt={hasAttempt}
                    />
                  ) : (
                    <span className={`inline-flex rounded-md bg-slate-300 px-3 py-1.5 ${secondaryUi.caption} font-bold text-slate-700`}>
                      Locked
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
