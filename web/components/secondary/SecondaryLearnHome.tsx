"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSecondaryActivityAvailabilityCounts,
  isSecondaryActivityAvailableToday,
  resolveSecondaryNextActivityKey,
} from "@/lib/secondary/secondary-study-activity";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { MatchActivity } from "@/components/secondary/MatchActivity";
import { ClozeActivity } from "@/components/secondary/ClozeActivity";
import { SpellingActivity } from "@/components/secondary/SpellingActivity";
import { SentenceActivity } from "@/components/secondary/SentenceActivity";
import { SecondaryLearnSubNav } from "@/components/secondary/learn/SecondaryLearnSubNav";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

const ACTIVITIES = [
  { key: "match" as const, shortTitle: "Match" },
  { key: "cloze" as const, shortTitle: "Cloze" },
  { key: "spelling" as const, shortTitle: "Spelling" },
  { key: "sentence" as const, shortTitle: "Sentence" },
];

function ActivityEmbed({ activityKey }: { activityKey: SecondaryTodayActivityKey }) {
  switch (activityKey) {
    case "match":
      return <MatchActivity compact />;
    case "cloze":
      return <ClozeActivity compact />;
    case "spelling":
      return <SpellingActivity compact />;
    case "sentence":
      return <SentenceActivity compact />;
  }
}

function ActivityLoading() {
  return (
    <div className="rounded-xl border border-sec-border bg-white/70 px-3 py-6 text-center">
      <p className={secondaryUi.bodyMuted}>Loading activity…</p>
    </div>
  );
}

function lockedReason(activityKey: SecondaryTodayActivityKey): string {
  if (activityKey === "cloze") return "Needs example sentences";
  if (activityKey === "sentence") return "Needs sentence prompts";
  return "Not available today";
}

/** Learn hub — quiz first, four circle/pill activity switches. */
export function SecondaryLearnHome() {
  const { todaySession, completion, hydrated } = useSecondaryTodaySession();
  const [index, setIndex] = useState(0);
  const didSeedIndex = useRef(false);

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
  const nextActivityKey = resolveSecondaryNextActivityKey(studyCtx);

  useEffect(() => {
    if (!hydrated || didSeedIndex.current) return;
    if (nextActivityKey) {
      const nextIndex = ACTIVITIES.findIndex((activity) => activity.key === nextActivityKey);
      if (nextIndex >= 0) setIndex(nextIndex);
    }
    didSeedIndex.current = true;
  }, [hydrated, nextActivityKey]);

  const activity = ACTIVITIES[index]!;
  const canOpen = isSecondaryActivityAvailableToday(activity.key, availabilityCounts);

  return (
    <section className="space-y-2">
      <SecondaryLearnSubNav />

      {!hydrated ? (
        <div
          className="h-10 animate-pulse rounded-xl border border-sec-border bg-white/70"
          aria-hidden
        />
      ) : !hasWordsToday ? (
        <div className="rounded-xl border border-amber-700 bg-amber-50 p-3">
          <p className={`${secondaryUi.cardTitle} text-amber-950`}>No words ready today</p>
          <p className={`mt-1 ${secondaryUi.caption} text-amber-900/80`}>
            Nothing ready today. Check back tomorrow, or ask your teacher.
          </p>
        </div>
      ) : null}

      <nav className="flex items-center justify-center gap-1.5" aria-label="Activities">
        {ACTIVITIES.map((item, itemIndex) => {
          const done = Boolean(completion[item.key]?.completed);
          const active = itemIndex === index;
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.shortTitle}
              aria-current={active ? "page" : undefined}
              onClick={() => setIndex(itemIndex)}
              className={`flex h-2.5 items-center justify-center overflow-hidden rounded-full transition-all duration-300 ease-out ${
                active
                  ? "w-12 bg-[var(--sec-accent)] px-1.5"
                  : done
                    ? "w-2.5 bg-emerald-500 hover:scale-110"
                    : "w-2.5 bg-[var(--sec-border)] hover:bg-[var(--sec-muted)] hover:scale-110"
              }`}
            >
              {active ? (
                <span className="truncate text-[8px] font-extrabold uppercase tracking-wide text-white">
                  {item.shortTitle}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div>
        {!hydrated ? (
          <ActivityLoading />
        ) : !canOpen ? (
          <div className="rounded-xl border border-dashed border-sec-border bg-sec-panel-muted px-3 py-6 text-center">
            <p className={secondaryUi.cardTitle}>Locked</p>
            <p className={`mt-1 ${secondaryUi.caption}`}>{lockedReason(activity.key)}</p>
          </div>
        ) : (
          <Suspense fallback={<ActivityLoading />}>
            <ActivityEmbed key={activity.key} activityKey={activity.key} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
