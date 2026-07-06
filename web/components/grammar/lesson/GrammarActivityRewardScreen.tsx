"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { GrammarRewardBreakdown, GrammarRunStats } from "@/lib/grammar-templates/grammar-run-session";

type Props = {
  lessonTitle: string;
  stats: GrammarRunStats;
  breakdown: GrammarRewardBreakdown;
  muted: boolean;
  finishLabel?: string;
  onFinish?: () => void;
};

export function GrammarActivityRewardScreen({
  lessonTitle,
  stats,
  breakdown,
  muted,
  finishLabel = "Close",
  onFinish,
}: Props) {
  const elapsedSec = Math.max(1, Math.round(stats.elapsedMs / 1000));

  return (
    <KidPanel className="m-auto max-w-md space-y-4 text-center">
      <p className="text-2xl font-extrabold text-kid-ink">Nice reading!</p>
      <p className="text-base font-semibold text-kid-ink/85">
        You finished <span className="font-bold">{lessonTitle}</span>.
      </p>
      <div className="rounded-2xl border-4 border-kid-ink bg-kid-surface-muted px-4 py-3 text-left">
        <p className="text-sm font-bold uppercase tracking-wide text-kid-ink/70">Rewards</p>
        <p className="mt-2 text-lg font-extrabold text-kid-ink">+{breakdown.totalGold} gold</p>
        <p className="text-base font-semibold text-kid-ink/85">+{breakdown.experienceDelta} XP</p>
        {breakdown.quizBonusGold > 0 ? (
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            Quiz bonus: +{breakdown.quizBonusGold} gold
          </p>
        ) : null}
        {breakdown.timeBonusGold > 0 ? (
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            Time bonus for reading carefully!
          </p>
        ) : null}
        <p className="mt-2 text-sm font-semibold text-kid-ink/70">Reading time: {elapsedSec}s</p>
      </div>
      <KidButton
        type="button"
        className="w-full"
        onClick={() => {
          playSfx("tap", muted);
          onFinish?.();
        }}
      >
        {finishLabel}
      </KidButton>
    </KidPanel>
  );
}
