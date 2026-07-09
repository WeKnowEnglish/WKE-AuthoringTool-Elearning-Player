"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import { getSecondaryWordDisplaySnapshot, getFocusHighlightWordIds, sortWordItemIdsByWeakness } from "@/lib/secondary/secondary-mastery-display";
import {
  countSecondaryActivityEligibleWords,
  filterWordItemIdsForSecondaryActivity,
} from "@/lib/secondary/secondary-practice-types";
import { isSecondaryWordMastered } from "@/lib/secondary/secondary-today-session";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { getSecondaryClozeTemplates } from "@/lib/secondary/secondary-vocab-bank";
import { SecondaryFocusWordsPanel } from "@/components/secondary/SecondaryFocusWordsPanel";
import { SecondaryVocabProgressCard } from "@/components/secondary/SecondaryVocabProgressCard";
import type {
  SecondaryTodayActivityKey,
} from "@/lib/secondary/types";

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
];

const ACTIVITY_HREF: Record<SecondaryTodayActivityKey, string> = {
  match: "/secondary/match",
  cloze: "/secondary/cloze",
  spelling: "/secondary/spelling",
};

export function SecondaryHome() {
  const { todaySession, completion, hydrated } = useSecondaryTodaySession();
  const { displayName, ready: nameReady } = useStudentDisplayName();

  const sessionWordIds = todaySession?.allWordItemIds ?? [];

  const matchCountToday = useMemo(
    () => countSecondaryActivityEligibleWords(sessionWordIds, "match"),
    [sessionWordIds],
  );
  const spellingCountToday = useMemo(
    () => countSecondaryActivityEligibleWords(sessionWordIds, "spelling"),
    [sessionWordIds],
  );
  const clozeCountToday = useMemo(() => {
    if (!todaySession) return 0;
    const clozeEligible = new Set(
      filterWordItemIdsForSecondaryActivity(sessionWordIds, "cloze"),
    );
    return (
      getSecondaryClozeTemplates()[0]?.blankWordItemIds.filter((id) => clozeEligible.has(id))
        .length ?? 0
    );
  }, [todaySession, sessionWordIds]);

  const hasWordsToday = sessionWordIds.length > 0;

  const isActivityAvailableToday = (activityKey: SecondaryTodayActivityKey) => {
    if (!hasWordsToday) return false;
    if (activityKey === "match") return matchCountToday > 0;
    if (activityKey === "cloze") return clozeCountToday > 0;
    if (activityKey === "spelling") return spellingCountToday > 0;
    return false;
  };

  const sortedTodayWordItemIds = useMemo(
    () => sortWordItemIdsByWeakness(sessionWordIds),
    [sessionWordIds],
  );

  const focusHighlightWordIds = useMemo(
    () => new Set(getFocusHighlightWordIds(sortedTodayWordItemIds)),
    [sortedTodayWordItemIds],
  );

  const masteredCount = (() => {
    if (!todaySession) return 0;
    return sessionWordIds.filter((wordItemId) =>
      isSecondaryWordMastered(getSecondaryWordDisplaySnapshot(wordItemId)),
    ).length;
  })();

  const nextActivityKey = (() => {
    const order: SecondaryTodayActivityKey[] = ["match", "cloze", "spelling"];
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
          <h2 className="text-2xl font-extrabold leading-snug text-kid-ink">
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
        )}
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <SecondaryFocusWordsPanel
          hydrated={hydrated}
          hasWordsToday={hasWordsToday}
          wordItemIds={sortedTodayWordItemIds}
          focusWordItemIds={focusHighlightWordIds}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {!hydrated ? (
            <div
              className="h-24 animate-pulse rounded-xl border-2 border-kid-ink/30 bg-white/70"
              aria-hidden
            />
          ) : !hasWordsToday ? (
            <div className="rounded-xl border-2 border-amber-700 bg-amber-50 p-4">
              <p className="text-sm font-extrabold text-amber-950">No words ready today</p>
              <p className="mt-1 text-xs font-semibold text-amber-900/80">
                The practice bank is empty or unavailable. Check back after content is loaded, or ask
                your teacher.
              </p>
            </div>
          ) : (
            <SecondaryVocabProgressCard
              masteredCount={masteredCount}
              totalCount={sessionWordIds.length}
            />
          )}

          {nextActivityKey ? (
            <div className="rounded-xl border-2 border-kid-ink bg-kid-panel p-4">
              <p className="text-sm font-extrabold text-kid-ink">
                Next up:{" "}
                {ACTIVITIES.find((a) => a.key === nextActivityKey)?.shortTitle ?? nextActivityKey}
              </p>
              <p className="mt-1 text-xs font-semibold text-kid-ink/75">
                Recommended order keeps practice measurable day to day.
              </p>
              <Link
                className="mt-3 inline-flex rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink"
                href={ACTIVITY_HREF[nextActivityKey]}
              >
                Continue
              </Link>
            </div>
          ) : allDoneToday ? (
            <div className="rounded-xl border-2 border-emerald-800 bg-emerald-50 p-4">
              <p className="text-sm font-extrabold text-emerald-950">Today&apos;s path is complete</p>
              <p className="mt-1 text-xs font-semibold text-emerald-900/80">
                Nice work. You can replay any activity below, or come back tomorrow for a fresh set.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            {ACTIVITIES.map((activity) => {
              const canOpen = isActivityAvailableToday(activity.key);
              const activityCompletion = completion[activity.key];
              const isNext = nextActivityKey === activity.key;
              const status = activityCompletion
                ? `Completed (${activityCompletion.percent}%)`
                : !hydrated
                  ? "Loading…"
                  : canOpen
                    ? isNext
                      ? "Up next"
                      : "Ready"
                    : "Not available today";

              return (
                <article
                  className={`rounded-xl border-2 border-kid-ink bg-white p-4 ${
                    isNext ? "ring-2 ring-kid-accent ring-offset-2" : ""
                  }`}
                  key={activity.href}
                >
                  <h3 className="text-sm font-extrabold text-kid-ink">{activity.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-kid-ink/70">{activity.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-kid-ink/75">{status}</span>
                    {canOpen ? (
                      <Link
                        href={activity.href}
                        className="rounded-md border-2 border-kid-ink bg-white px-2 py-1 text-xs font-extrabold text-kid-ink"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="rounded-md bg-slate-300 px-2 py-1 text-xs font-bold text-slate-700">
                        Locked
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
