"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getSecondaryWordProgressRecord,
  mapMasteryLevelToLabel,
} from "@/lib/secondary/secondary-word-progress";
import {
  getOrCreateSecondaryTodaySession,
  getSecondaryTodayCompletion,
  MASTERED_LEVEL_THRESHOLD,
  WARMUP_WORDS,
} from "@/lib/secondary/secondary-today-session";
import {
  getSecondaryClozeTemplates,
  getSecondaryVocabItemById,
  getSecondaryVocabItemsByIds,
} from "@/lib/secondary/secondary-vocab-bank";
import type {
  SecondaryTodayActivityKey,
  SecondaryTodayCompletion,
  SecondaryTodaySession,
} from "@/lib/secondary/types";

const ACTIVITIES = [
  {
    key: "match" as const,
    href: "/secondary/match",
    title: "Match The Word To The Definition",
    description: "Pair key academic words with the best definition.",
  },
  {
    key: "cloze" as const,
    href: "/secondary/cloze",
    title: "Cloze Paragraph",
    description: "Complete a paragraph by filling each blank with the correct word.",
  },
  {
    key: "spelling" as const,
    href: "/secondary/spelling",
    title: "Spelling Activity",
    description: "Type the correct spelling from meaning-based prompts.",
  },
];

export function SecondaryHome() {
  const [todaySession, setTodaySession] = useState<SecondaryTodaySession | null>(null);
  const [completion, setCompletion] = useState<SecondaryTodayCompletion>({});

  useEffect(() => {
    const now = new Date();
    setTodaySession(getOrCreateSecondaryTodaySession(now));
    setCompletion(getSecondaryTodayCompletion(now));
  }, []);

  const todayWordSet = new Set(todaySession?.allWordItemIds ?? []);
  const todayItems = useMemo(
    () => (todaySession ? getSecondaryVocabItemsByIds(todaySession.allWordItemIds) : []),
    [todaySession],
  );

  const matchCountToday = todayItems.length;
  const clozeCountToday =
    getSecondaryClozeTemplates()[0]?.blankWordItemIds.filter((id) => todayWordSet.has(id))
      .length ?? 0;
  const spellingCountToday = todayItems.length;

  const isActivityAvailableToday = (activityKey: SecondaryTodayActivityKey) => {
    if (activityKey === "match") return matchCountToday > 0;
    if (activityKey === "cloze") return clozeCountToday > 0;
    if (activityKey === "spelling") return spellingCountToday > 0;
    return false;
  };

  const weakWordItemIds = (() => {
    if (!todaySession) return [];
    const records = todaySession.allWordItemIds
      .map((wordItemId) => {
        const rec = getSecondaryWordProgressRecord(wordItemId);
        return {
          wordItemId,
          masteryLevel: rec?.masteryLevel ?? 0,
          recentAccuracy: rec?.recentAccuracy ?? 0,
          timesSeen: rec?.timesSeen ?? 0,
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
    return todaySession.allWordItemIds.filter((wordItemId) => {
      const rec = getSecondaryWordProgressRecord(wordItemId);
      return (rec?.masteryLevel ?? 0) >= MASTERED_LEVEL_THRESHOLD;
    }).length;
  })();

  const nextActivityKey = (() => {
    const order: SecondaryTodayActivityKey[] = ["match", "cloze", "spelling"];
    for (const key of order) {
      if (!isActivityAvailableToday(key)) continue;
      if (!completion[key]) return key;
    }
    return null;
  })();

  return (
    <section className="space-y-4">
      <header className="rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
          Lower Secondary Portal
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-kid-ink">Vocabulary Practice</h2>
        <p className="mt-2 text-sm font-semibold text-kid-ink/80">
          Today&apos;s practice is controlled and measurable. Finish Match, then Cloze, then
          Spelling.
        </p>
      </header>

      {todaySession ? (
        <div className="flex flex-wrap gap-2">
          <Badge label={`Today: ${todaySession.allWordItemIds.length} words`} />
          <Badge
            label={`Warm-up: ${Math.min(WARMUP_WORDS, todaySession.warmUpWordItemIds.length)}`}
          />
          <Badge label={`Mastered: ${masteredCount}`} />
        </div>
      ) : null}

      {weakWordItemIds.length > 0 && todaySession ? (
        <div className="rounded-xl border-2 border-kid-ink bg-white p-4">
          <p className="text-sm font-extrabold text-kid-ink">Weak words</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {weakWordItemIds.map((wordItemId) => {
              const item = getSecondaryVocabItemById(wordItemId);
              const level = getSecondaryWordProgressRecord(wordItemId)?.masteryLevel ?? 0;
              return (
                <span
                  key={wordItemId}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800"
                >
                  {item?.word ?? wordItemId} - {mapMasteryLevelToLabel(level)}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {nextActivityKey ? (
        <div className="rounded-xl border-2 border-kid-ink bg-kid-panel p-4">
          <p className="text-sm font-extrabold text-kid-ink">Next: {nextActivityKey.toUpperCase()}</p>
          <Link
            className="mt-2 inline-flex rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink"
            href={
              nextActivityKey === "match"
                ? "/secondary/match"
                : nextActivityKey === "cloze"
                  ? "/secondary/cloze"
                  : "/secondary/spelling"
            }
          >
            Continue
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {ACTIVITIES.map((activity) => {
          const canOpen = isActivityAvailableToday(activity.key);
          const activityCompletion = completion[activity.key];
          const status = activityCompletion
            ? `Completed (${activityCompletion.percent}%)`
            : canOpen
              ? "Not completed"
              : "Not available today";

          return (
            <article
              className="rounded-xl border-2 border-kid-ink bg-white p-4"
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
                    Open
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
