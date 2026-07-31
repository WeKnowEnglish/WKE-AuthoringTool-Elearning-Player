"use client";

import Link from "next/link";
import { SecondaryLearnSubNav } from "@/components/secondary/learn/SecondaryLearnSubNav";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";

/**
 * Words mode shell. The vocabulary list + drawer are owned by
 * SecondaryPracticeLayout when on /secondary/learn/words; this page
 * only covers empty / loading messaging and the Learn sub-nav.
 */
export function SecondaryLearnWordsHome() {
  const { todaySession, hydrated } = useSecondaryTodaySession();
  const hasWordsToday = (todaySession?.allWordItemIds.length ?? 0) > 0;

  return (
    <section className="space-y-3">
      <SecondaryLearnSubNav />

      {!hydrated ? (
        <div
          className="mx-auto h-48 max-w-xl animate-pulse rounded-xl border border-sec-border bg-white/70"
          aria-hidden
        />
      ) : !hasWordsToday ? (
        <div className="mx-auto max-w-xl rounded-xl border border-amber-700 bg-amber-50 p-4">
          <p className={`${secondaryUi.cardTitle} text-amber-950`}>No words ready today</p>
          <p className={`mt-1 ${secondaryUi.caption} text-amber-900/80`}>
            Nothing ready today. Check back tomorrow, or ask your teacher.
          </p>
          <Link href="/secondary/learn" className={`mt-3 inline-flex ${secondaryUi.btnPrimaryCompact}`}>
            Go to Practice
          </Link>
        </div>
      ) : (
        <p className={`text-center ${secondaryUi.caption}`}>
          Tap a word to study meaning, examples, and tips.
        </p>
      )}
    </section>
  );
}
