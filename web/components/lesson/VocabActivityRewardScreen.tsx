"use client";

import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { useState } from "react";
import {
  KidButton,
  kidLinkSecondaryClassName,
} from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import { KidPanel } from "@/components/kid-ui/KidPanel";
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
      className={clsx(
        "flex w-full flex-1 flex-col items-center justify-center rounded-xl border-2 border-kid-ink px-2 py-1.5 shadow-[2px_2px_0_#0a2f86]",
        tone === "coin" ? "bg-amber-100" : "bg-sky-100",
      )}
    >
      <span className="text-3xl font-black leading-none text-kid-ink sm:text-4xl">{value}</span>
      <span
        className={clsx(
          "mt-0.5 text-sm font-black sm:text-base",
          tone === "coin" ? "text-amber-950" : "text-sky-950",
        )}
      >
        {label}
      </span>
    </div>
  );
}

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
      ? `${stats.firstTryCorrect} right the first time!`
      : null;
  const extraLine = `${stats.wordsMastered} super word${stats.wordsMastered === 1 ? "" : "s"} · ${formatVocabElapsed(stats.elapsedMs)}`;

  const bonusRows: { label: string; coins: number }[] = [];
  if (stats.practiceGold > 0) {
    bonusRows.push({ label: "During the lesson", coins: stats.practiceGold });
  }
  bonusRows.push({ label: "Finish bonus", coins: breakdown.baseGold });
  if (breakdown.accuracyBonusGold > 0) {
    bonusRows.push({ label: "Got it first time", coins: breakdown.accuracyBonusGold });
  }
  if (breakdown.masteryBonusGold > 0) {
    bonusRows.push({ label: "Super words", coins: breakdown.masteryBonusGold });
  }
  if (breakdown.timeBonusGold > 0) {
    bonusRows.push({ label: "Speed bonus", coins: breakdown.timeBonusGold });
  }

  return (
    <div className="relative box-border flex min-h-0 flex-1 flex-col py-[100px] px-[200px] max-[480px]:px-4 max-[480px]:py-4">
      <KidConfetti active />
      <KidPanel
        tone="discovery"
        className="relative flex min-h-0 flex-1 flex-col justify-start gap-2 border-kid-ink p-3 sm:p-4"
      >
        <div className="shrink-0 text-center">
          <p className="text-3xl font-black leading-tight text-kid-ink sm:text-4xl">Awesome!</p>
          <p className="mt-0.5 text-base font-bold text-kid-ink sm:text-lg">
            <span className="font-black">{lessonTitle}</span>
            <span className="text-kid-ink/80"> — done!</span>
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 items-stretch gap-2">
          <div className="flex flex-col justify-center rounded-xl border-2 border-[#152668] bg-white px-2 py-2 text-center shadow-[2px_2px_0_#152668]">
            <p className="text-4xl font-black leading-none text-kid-ink sm:text-5xl">
              {stats.firstTryAccuracyPercent}%
            </p>
            <p className="mt-0.5 text-sm font-bold text-kid-ink sm:text-base">Got it first time</p>
            {firstTryLine ? (
              <p className="mt-0.5 text-xs font-semibold text-kid-ink/75 sm:text-sm">{firstTryLine}</p>
            ) : null}
            <p className="mt-0.5 text-xs font-semibold text-kid-ink/70 sm:text-sm">{extraLine}</p>
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <RewardPill label="Coins" value={breakdown.totalGold} tone="coin" />
            <RewardPill label="XP" value={breakdown.experienceDelta} tone="xp" />
          </div>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            className="mx-auto block text-sm font-bold text-kid-ink/70 underline decoration-2 underline-offset-2 hover:text-kid-ink sm:text-base"
            onClick={() => {
              playSfx("tap", muted);
              setShowBreakdown((v) => !v);
            }}
          >
            {showBreakdown ? "Hide details" : "How you earned coins"}
          </button>
          {showBreakdown ? (
            <ul className="mt-1.5 space-y-1 rounded-xl border-2 border-kid-ink/20 bg-white/80 px-3 py-2 text-sm font-semibold text-kid-ink sm:text-base">
              {bonusRows.map((row) => (
                <li key={row.label} className="flex justify-between gap-3">
                  <span>{row.label}</span>
                  <span className="font-black">+{row.coins}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="shrink-0">
          {reviewWords.length > 0 ? (
            <div>
              <p className="mb-1.5 text-center text-lg font-black text-kid-ink sm:text-xl">
                Practice these next time
              </p>
              <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {reviewWords.map((w) => (
                  <li
                    key={w.id}
                    className="flex w-20 shrink-0 snap-center flex-col items-center gap-1 rounded-xl border-2 border-[#152668] bg-[#dbeafe] p-1.5 shadow-[2px_2px_0_#152668]"
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border-2 border-[#152668]/30 bg-white sm:h-[4.5rem] sm:w-[4.5rem]">
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
                    <span className="text-center text-sm font-black text-kid-ink sm:text-base">
                      {w.lemma}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center text-lg font-black text-emerald-800 sm:text-xl">
              Every word — first try!
            </p>
          )}
        </div>

        <div className="mt-auto flex shrink-0 flex-wrap justify-center gap-2 pt-1">
          <KidButton
            type="button"
            className="!min-h-11 !px-5 !text-lg"
            onClick={() => {
              playSfx("tap", muted);
              onPlayAgain();
            }}
          >
            Play again
          </KidButton>
          {onFinish ? (
            <KidButton
              type="button"
              variant="secondary"
              className="!min-h-11 !px-5 !text-lg"
              onClick={() => {
                playSfx("tap", muted);
                onFinish();
              }}
            >
              {finishLabel}
            </KidButton>
          ) : (
            <Link href="/learn" className={clsx(kidLinkSecondaryClassName, "!min-h-11 !text-lg")}>
              {finishLabel}
            </Link>
          )}
        </div>
      </KidPanel>
    </div>
  );
}
