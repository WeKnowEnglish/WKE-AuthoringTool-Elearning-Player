"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import {
  countSecondaryActivityEligibleWords,
  filterWordItemIdsForSecondaryActivity,
} from "@/lib/secondary/secondary-practice-types";
import {
  mapMasteryLevelToLabel,
} from "@/lib/secondary/secondary-word-progress";
import {
  isSecondaryWordMastered,
  WARMUP_WORDS,
} from "@/lib/secondary/secondary-today-session";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import {
  getSecondaryClozeTemplates,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
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

  const weakWordItemIds = (() => {
    if (!sessionWordIds.length) return [];
    const records = sessionWordIds
      .map((wordItemId) => {
        const snap = getSecondaryWordDisplaySnapshot(wordItemId);
        return {
          wordItemId,
          masteryLevel: snap.legacyLevel,
          recentAccuracy: snap.recentAccuracy,
          timesSeen: snap.timesSeen,
        };
      })
      .sort((a, b) => {
        if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
        if (a.recentAccuracy !== b.recentAccuracy) return a.recentAccuracy - b.recentAccuracy;
        return a.timesSeen - b.timesSeen;
      });

    return records.slice(0, 6).map((r) => r.wordItemId);
  })();

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

  return (
    <section className="space-y-4">
      <header className="rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
          Lower Secondary Portal
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-kid-ink">Vocabulary Practice</h2>
        <p className="mt-2 text-sm font-semibold text-kid-ink/80">
          Work in order: Match → Cloze → Spelling. Today&apos;s word set stays the same until
          tomorrow.
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
          Path: Match → Cloze → Spelling
        </p>
      </header>

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
        <div className="flex flex-wrap gap-2">
          <Badge label={`Today: ${sessionWordIds.length} words`} />
          <Badge
            label={`Warm-up: ${Math.min(WARMUP_WORDS, todaySession!.warmUpWordItemIds.length)}`}
          />
          <Badge label={`Mastered: ${masteredCount}`} />
        </div>
      )}

      {hydrated && hasWordsToday && weakWordItemIds.length > 0 ? (
        <div className="rounded-xl border-2 border-kid-ink bg-white p-4">
          <p className="text-sm font-extrabold text-kid-ink">Focus words</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {weakWordItemIds.map((wordItemId) => {
              const item = getSecondaryVocabItemById(wordItemId);
              const snap = getSecondaryWordDisplaySnapshot(wordItemId);
              return (
                <span
                  key={wordItemId}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800"
                >
                  {item?.word ?? wordItemId} — {mapMasteryLevelToLabel(snap.legacyLevel)}
                </span>
              );
            })}
          </div>
        </div>
      ) : hydrated && hasWordsToday ? (
        <div className="rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4">
          <p className="text-sm font-extrabold text-emerald-950">No weak words flagged yet</p>
          <p className="mt-1 text-xs font-semibold text-emerald-900/80">
            Finish today&apos;s activities to build a focus list.
          </p>
        </div>
      ) : null}

      {nextActivityKey ? (
        <div className="rounded-xl border-2 border-kid-ink bg-kid-panel p-4">
          <p className="text-sm font-extrabold text-kid-ink">
            Next up: {ACTIVITIES.find((a) => a.key === nextActivityKey)?.shortTitle ?? nextActivityKey}
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
    </section>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border-2 border-kid-ink bg-white px-3 py-1 text-xs font-extrabold text-kid-ink">
      {label}
    </span>
  );
}
