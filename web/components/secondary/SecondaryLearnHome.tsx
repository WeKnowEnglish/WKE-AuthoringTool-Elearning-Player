"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildSecondaryActivityAvailabilityCounts,
  isSecondaryActivityAvailableToday,
  resolveSecondaryNextActivityKey,
} from "@/lib/secondary/secondary-study-activity";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { SecondaryHomeIcon } from "@/components/secondary/SecondaryHomeIcon";
import { getSecondaryActivityIconUrl } from "@/lib/secondary/secondary-activity-icons";
import { MatchActivity } from "@/components/secondary/MatchActivity";
import { ClozeActivity } from "@/components/secondary/ClozeActivity";
import { SpellingActivity } from "@/components/secondary/SpellingActivity";
import { SentenceActivity } from "@/components/secondary/SentenceActivity";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

const ACTIVITIES = [
  {
    key: "match" as const,
    title: "1. Match",
    shortTitle: "Match",
    description: "Pair each word with the best definition.",
  },
  {
    key: "cloze" as const,
    title: "2. Cloze",
    shortTitle: "Cloze",
    description: "Fill each blank in today's paragraph.",
  },
  {
    key: "spelling" as const,
    title: "3. Spelling",
    shortTitle: "Spelling",
    description: "Type the correct spelling from meaning prompts.",
  },
  {
    key: "sentence" as const,
    title: "4. Sentence",
    shortTitle: "Sentence",
    description: "Write a sentence with 5 vocabulary words for your teacher to review.",
  },
];

function ActivityEmbed({ activityKey }: { activityKey: SecondaryTodayActivityKey }) {
  switch (activityKey) {
    case "match":
      return <MatchActivity />;
    case "cloze":
      return <ClozeActivity />;
    case "spelling":
      return <SpellingActivity />;
    case "sentence":
      return <SentenceActivity />;
  }
}

function ActivityLoading() {
  return (
    <div className="rounded-xl border border-sec-border bg-white/70 px-4 py-10 text-center">
      <p className={`${secondaryUi.bodyMuted}`}>Loading activity…</p>
    </div>
  );
}

function lockedReason(activityKey: SecondaryTodayActivityKey): string {
  if (activityKey === "cloze") return "Needs example sentences";
  if (activityKey === "sentence") return "Needs sentence prompts";
  return "Not available today";
}

/** Learn · Vocabulary — one activity at a time, quiz embedded in the card. */
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
  const activityCompletion = completion[activity.key];
  const isNext = nextActivityKey === activity.key;
  const canPrev = index > 0;
  const canNext = index < ACTIVITIES.length - 1;

  const status = activityCompletion
    ? activity.key === "sentence"
      ? `Sent for review (${activityCompletion.percent}%)`
      : `Completed (${activityCompletion.percent}%)`
    : !hydrated
      ? "Getting your practice ready…"
      : canOpen
        ? isNext
          ? "Up next"
          : "Ready"
        : lockedReason(activity.key);

  return (
    <section className="space-y-4">
      {!hydrated ? (
        <div
          className="h-24 animate-pulse rounded-xl border border-sec-border bg-white/70"
          aria-hidden
        />
      ) : !hasWordsToday ? (
        <div className="rounded-xl border border-amber-700 bg-amber-50 p-4">
          <p className={`${secondaryUi.cardTitle} text-amber-950`}>No words ready today</p>
          <p className={`mt-1 ${secondaryUi.bodyMuted} text-amber-900/80`}>
            Nothing ready today. Check back tomorrow, or ask your teacher.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <h1 className={secondaryUi.pageTitle}>Learn</h1>
          <p className={`mt-1 ${secondaryUi.bodyMuted}`}>
            One activity at a time — use the arrows to move between Match, Cloze, Spelling, and
            Sentence.
          </p>
        </div>
        <p className={`${secondaryUi.caption} shrink-0 font-extrabold tabular-nums`}>
          {index + 1}/{ACTIVITIES.length}
        </p>
      </div>

      <div className="relative px-5 sm:px-7">
        <button
          type="button"
          aria-label="Previous activity"
          disabled={!canPrev}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          className="absolute left-0 top-8 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-sec-border bg-white text-sec-ink shadow-md transition hover:border-sec-accent disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next activity"
          disabled={!canNext}
          onClick={() => setIndex((current) => Math.min(ACTIVITIES.length - 1, current + 1))}
          className="absolute right-0 top-8 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-sec-border bg-white text-sec-ink shadow-md transition hover:border-sec-accent disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <article
          className={`overflow-hidden rounded-2xl border bg-sec-card shadow-sm ${
            isNext ? "border-sec-accent" : "border-sec-border"
          }`}
        >
          <header className="flex items-start gap-3 border-b border-sec-border px-4 py-4 sm:px-5">
            <SecondaryHomeIcon src={getSecondaryActivityIconUrl(activity.key)} size="md" />
            <div className="min-w-0 flex-1">
              <h2 className={secondaryUi.cardTitle}>{activity.title}</h2>
              <p className={`mt-1 ${secondaryUi.captionMuted}`}>{activity.description}</p>
              <p className={`mt-2 ${secondaryUi.caption} font-bold`}>{status}</p>
            </div>
          </header>

          <div className="px-3 py-4 sm:px-5">
            {!hydrated ? (
              <ActivityLoading />
            ) : !canOpen ? (
              <div className="rounded-xl border border-dashed border-sec-border bg-sec-panel-muted px-4 py-10 text-center">
                <p className={secondaryUi.cardTitle}>Locked</p>
                <p className={`mt-1 ${secondaryUi.bodyMuted}`}>{lockedReason(activity.key)}</p>
              </div>
            ) : (
              <Suspense fallback={<ActivityLoading />}>
                <ActivityEmbed key={activity.key} activityKey={activity.key} />
              </Suspense>
            )}
          </div>
        </article>
      </div>

      <nav className="flex justify-center gap-2" aria-label="Activity steps">
        {ACTIVITIES.map((item, itemIndex) => {
          const done = Boolean(completion[item.key]?.completed);
          const active = itemIndex === index;
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.shortTitle}
              aria-current={active ? "step" : undefined}
              onClick={() => setIndex(itemIndex)}
              className={`h-2.5 rounded-full transition ${
                active
                  ? "w-8 bg-sec-accent"
                  : done
                    ? "w-2.5 bg-emerald-500"
                    : "w-2.5 bg-sec-border"
              }`}
            />
          );
        })}
      </nav>
    </section>
  );
}
