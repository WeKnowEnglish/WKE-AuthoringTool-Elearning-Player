"use client";

import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import { dailyMasteryGoalProgressFromSession } from "@/lib/secondary/secondary-daily-mastery-goal";
import { compileSecondaryClozeFromWordIds } from "@/lib/secondary/secondary-cloze-compiler";
import { countSecondaryActivityEligibleWords } from "@/lib/secondary/secondary-practice-types";
import { getSecondarySentenceEligibleWordIds } from "@/lib/secondary/secondary-sentence-word-set";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { SecondaryVocabProgressCard } from "@/components/secondary/SecondaryVocabProgressCard";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

const ACTIVITY_HREF: Record<SecondaryTodayActivityKey, string> = {
  match: "/secondary/match",
  cloze: "/secondary/cloze",
  spelling: "/secondary/spelling",
  sentence: "/secondary/sentence",
};

export function SecondaryHome() {
  const { todaySession, completion, hydrated, sessionRevision } = useSecondaryTodaySession();
  const { displayName, ready: nameReady } = useStudentDisplayName();
  const [showListUpdated, setShowListUpdated] = useState(false);
  const introducedCountRef = useRef(0);

  const sessionWordIds = todaySession?.allWordItemIds ?? [];
  useEffect(() => {
    const introducedCount = todaySession?.introducedWordItemIds?.length ?? 0;
    if (hydrated && introducedCount > introducedCountRef.current) {
      setShowListUpdated(true);
    }
    introducedCountRef.current = introducedCount;
  }, [hydrated, sessionRevision, todaySession?.introducedWordItemIds]);

  useEffect(() => {
    if (!showListUpdated) return;
    const timer = window.setTimeout(() => setShowListUpdated(false), 6000);
    return () => window.clearTimeout(timer);
  }, [showListUpdated]);

  const matchCountToday = useMemo(
    () => countSecondaryActivityEligibleWords(sessionWordIds, "match"),
    [sessionWordIds],
  );
  const spellingCountToday = useMemo(
    () => countSecondaryActivityEligibleWords(sessionWordIds, "spelling"),
    [sessionWordIds],
  );
  const sentenceCountToday = useMemo(() => getSecondarySentenceEligibleWordIds().length, []);
  const clozeCountToday = useMemo(() => {
    if (!todaySession) return 0;
    const compiled = compileSecondaryClozeFromWordIds({
      wordItemIds: sessionWordIds,
      studentId: resolveSecondaryStudentId(),
      dateKey: todaySession.dateKey,
    });
    return compiled?.blankWordItemIds.length ?? 0;
  }, [todaySession, sessionWordIds]);

  const hasWordsToday = sessionWordIds.length > 0;

  const isActivityAvailableToday = (activityKey: SecondaryTodayActivityKey) => {
    if (activityKey === "sentence") return sentenceCountToday > 0;
    if (!hasWordsToday) return false;
    if (activityKey === "match") return matchCountToday > 0;
    if (activityKey === "cloze") return clozeCountToday > 0;
    if (activityKey === "spelling") return spellingCountToday > 0;
    return false;
  };

  const dailyGoalProgress = useMemo(() => {
    if (!todaySession) {
      return { masteredCount: 0, goal: 10, remainingCount: 10, goalReached: false };
    }
    return dailyMasteryGoalProgressFromSession(todaySession, getSecondaryWordDisplaySnapshot);
  }, [todaySession, sessionRevision]);

  const nextActivityKey = (() => {
    const order: SecondaryTodayActivityKey[] = ["match", "cloze", "spelling", "sentence"];
    for (const key of order) {
      if (!isActivityAvailableToday(key)) continue;
      if (!completion[key]) return key;
    }
    return null;
  })();

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
                      href={ACTIVITY_HREF[nextActivityKey]}
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
            {hasWordsToday ? (
              <p className={`mt-2 ${secondaryUi.bodyMuted}`}>
                Master {dailyGoalProgress.goal} focus words today — warm-up words drop off once mastered.
              </p>
            ) : null}
          </>
        )}
      </header>

      {showListUpdated ? (
        <div
          className={`rounded-xl border-2 border-sky-800 bg-sky-50 px-4 py-3 ${secondaryUi.body} text-sky-950`}
          role="status"
        >
          Your word list updated — check the sidebar for new focus words.
        </div>
      ) : null}

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
              The practice bank is empty or unavailable. Check back after content is loaded, or ask
              your teacher.
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
                <div className="flex-1">
                  <p className={secondaryUi.cardTitle}>
                    Next up:{" "}
                    {ACTIVITIES.find((a) => a.key === nextActivityKey)?.shortTitle ?? nextActivityKey}
                  </p>
                  <p className={`mt-1 ${secondaryUi.captionMuted}`}>
                    Recommended order keeps practice measurable day to day.
                  </p>
                </div>
                <Link className={`mt-3 inline-flex w-fit ${secondaryUi.btnPrimary}`} href={ACTIVITY_HREF[nextActivityKey]}>
                  Continue
                </Link>
              </div>
            ) : allDoneToday ? (
              <div className="flex flex-col rounded-xl border-2 border-emerald-800 bg-emerald-50 p-4">
                <p className={`${secondaryUi.cardTitle} text-emerald-950`}>Today&apos;s path is complete</p>
                <p className={`mt-1 flex-1 ${secondaryUi.bodyMuted} text-emerald-900/80`}>
                  Nice work. Replay any activity to keep building, or come back tomorrow for a fresh set.
                  Keep mastering focus words to rotate new ones onto your list.
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIVITIES.map((activity) => {
            const canOpen = isActivityAvailableToday(activity.key);
            const activityCompletion = completion[activity.key];
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
                <h3 className={secondaryUi.cardTitle}>{activity.title}</h3>
                <p className={`mt-1 ${secondaryUi.captionMuted}`}>{activity.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`${secondaryUi.caption} font-bold`}>{status}</span>
                  {canOpen ? (
                    <Link href={activity.href} className={`${secondaryUi.btnSecondary} !px-3 !py-1.5 !text-sm`}>
                      Open
                    </Link>
                  ) : (
                    <span className={`rounded-md bg-slate-300 px-3 py-1.5 ${secondaryUi.caption} font-bold text-slate-700`}>
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
