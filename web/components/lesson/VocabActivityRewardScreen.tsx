"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import { playSfx } from "@/lib/audio/sfx";
import type {
  VocabPracticeWordMeta,
  VocabRewardBreakdown,
  VocabRunStats,
} from "@/lib/vocabulary-templates/vocab-run-session";
import { formatVocabElapsed } from "@/lib/vocabulary-templates/vocab-run-session";

function RewardPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "coin" | "xp";
}) {
  return (
    <div
      className={`flex w-full flex-1 flex-col items-center justify-center rounded-2xl border border-[var(--pl-border)] px-2 py-2 ${
        tone === "coin" ? "bg-amber-50" : "bg-[var(--pl-purple-soft)]"
      }`}
    >
      <span className="text-3xl font-black leading-none text-[var(--pl-ink)] sm:text-4xl">
        {value}
      </span>
      <span
        className={`mt-0.5 text-sm font-extrabold sm:text-base ${
          tone === "coin" ? "text-amber-900" : "text-[var(--pl-purple)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Product A finish screen — Primary chrome when nested under VocabularySetOverlay.
 */
export function VocabActivityRewardScreen({
  lessonTitle,
  stats,
  breakdown,
  practiceWords,
  muted,
  onPlayAgain,
  onFinish,
  finishLabel = "Finish",
}: {
  lessonTitle: string;
  stats: VocabRunStats;
  breakdown: VocabRewardBreakdown;
  practiceWords: VocabPracticeWordMeta[];
  muted: boolean;
  onPlayAgain: () => void;
  onFinish?: () => void;
  finishLabel?: string;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const reviewWords = stats.reviewWordIds
    .map((id) => practiceWords.find((w) => w.id === id))
    .filter((w): w is VocabPracticeWordMeta => w != null);

  const firstTryLine =
    stats.firstTryGraded > 0
      ? `${stats.firstTryCorrect} correct on the first try!`
      : null;
  const extraLine = `${stats.wordsMastered} super word${stats.wordsMastered === 1 ? "" : "s"} · ${formatVocabElapsed(stats.elapsedMs)}`;

  const bonusRows: { label: string; coins: number }[] = [];
  if (stats.practiceGold > 0) {
    bonusRows.push({ label: "During the lesson", coins: stats.practiceGold });
  }
  bonusRows.push({ label: "Finish bonus", coins: breakdown.baseGold });
  if (breakdown.accuracyBonusGold > 0) {
    bonusRows.push({ label: "First-try bonus", coins: breakdown.accuracyBonusGold });
  }
  if (breakdown.masteryBonusGold > 0) {
    bonusRows.push({ label: "Super words", coins: breakdown.masteryBonusGold });
  }
  if (breakdown.timeBonusGold > 0) {
    bonusRows.push({ label: "Speed bonus", coins: breakdown.timeBonusGold });
  }

  const primaryBtn =
    "inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98]";
  const secondaryBtn =
    "inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-white px-5 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)]";

  return (
    <div className="relative box-border flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
      <KidConfetti active />
      <div className="relative m-auto flex w-full max-w-lg flex-col gap-3 rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-5">
        <div className="shrink-0 text-center">
          <p className="text-3xl font-extrabold leading-tight text-[var(--pl-ink)] sm:text-4xl">
            Awesome!
          </p>
          <p className="mt-1 text-base font-bold text-[var(--pl-muted)] sm:text-lg">
            <span className="font-extrabold text-[var(--pl-ink)]">{lessonTitle}</span>
            <span> — done!</span>
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 items-stretch gap-2">
          <div className="flex flex-col justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-2 py-3 text-center">
            <p className="text-4xl font-extrabold leading-none text-[var(--pl-ink)] sm:text-5xl">
              {stats.firstTryAccuracyPercent}%
            </p>
            <p className="mt-1 text-sm font-extrabold text-[var(--pl-muted)]">First-try accuracy</p>
            {firstTryLine ? (
              <p className="mt-0.5 text-xs font-semibold text-[var(--pl-muted)]">{firstTryLine}</p>
            ) : null}
            <p className="mt-0.5 text-xs font-semibold text-[var(--pl-muted)]">{extraLine}</p>
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <RewardPill label="Coins" value={breakdown.totalGold} tone="coin" />
            <RewardPill label="XP" value={breakdown.experienceDelta} tone="xp" />
          </div>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            className="mx-auto block text-sm font-bold text-[var(--pl-muted)] underline decoration-2 underline-offset-2 hover:text-[var(--pl-purple)]"
            onClick={() => {
              playSfx("tap", muted);
              setShowBreakdown((v) => !v);
            }}
          >
            {showBreakdown ? "Hide details" : "How you earned coins"}
          </button>
          {showBreakdown ? (
            <ul className="mt-2 space-y-1 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2 text-sm font-semibold text-[var(--pl-ink)]">
              {bonusRows.map((row) => (
                <li key={row.label} className="flex justify-between gap-3">
                  <span>{row.label}</span>
                  <span className="font-extrabold">+{row.coins}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="shrink-0">
          {reviewWords.length > 0 ? (
            <div>
              <p className="mb-2 text-center text-base font-extrabold text-[var(--pl-ink)] sm:text-lg">
                Practice these next time
              </p>
              <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {reviewWords.map((w) => (
                  <li
                    key={w.id}
                    className="flex w-20 shrink-0 snap-center flex-col items-center gap-1 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-purple-soft)] p-1.5"
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--pl-border)] bg-white sm:h-[4.5rem] sm:w-[4.5rem]">
                      <Image
                        src={w.imageUrl}
                        alt=""
                        fill
                        className="object-contain p-1"
                        sizes="72px"
                        unoptimized={
                          w.imageUrl.endsWith(".svg") ||
                          w.imageUrl.includes("supabase.co") ||
                          w.imageUrl.includes("placehold.co")
                        }
                      />
                    </div>
                    <span className="text-center text-sm font-extrabold text-[var(--pl-ink)]">
                      {w.lemma}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center text-base font-extrabold text-[var(--pl-teal)] sm:text-lg">
              Every word — first try!
            </p>
          )}
        </div>

        <div className="mt-1 flex shrink-0 flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap">
          {onFinish ? (
            <button
              type="button"
              className={primaryBtn}
              onClick={() => {
                playSfx("tap", muted);
                onFinish();
              }}
            >
              {finishLabel}
            </button>
          ) : (
            <Link href="/primary?nav=vocabulary" className={primaryBtn}>
              {finishLabel}
            </Link>
          )}
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => {
              playSfx("tap", muted);
              onPlayAgain();
            }}
          >
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
