"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  LEVEL_UP_EVENT,
  type LevelUpEventDetail,
} from "@/lib/progress/level-up-events";

type Props = {
  muted?: boolean;
};

function RewardPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "coin" | "skill";
}) {
  return (
    <div
      className={clsx(
        "flex min-w-[7rem] flex-1 flex-col items-center justify-center rounded-xl border-2 border-kid-ink px-3 py-2 shadow-[2px_2px_0_#0a2f86]",
        tone === "coin" ? "bg-amber-100" : "bg-violet-100",
      )}
    >
      <span className="text-3xl font-black leading-none text-kid-ink sm:text-4xl">{value}</span>
      <span
        className={clsx(
          "mt-0.5 text-center text-sm font-black sm:text-base",
          tone === "coin" ? "text-amber-950" : "text-violet-950",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function LevelUpModal({ muted = false }: Props) {
  const [detail, setDetail] = useState<LevelUpEventDetail | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    function onLevelUp(e: Event) {
      const ev = e as CustomEvent<LevelUpEventDetail>;
      if (!ev.detail) return;
      setShowBreakdown(false);
      setDetail(ev.detail);
      playSfx("complete", muted);
    }
    window.addEventListener(LEVEL_UP_EVENT, onLevelUp);
    return () => window.removeEventListener(LEVEL_UP_EVENT, onLevelUp);
  }, [muted]);

  if (!detail) return null;

  const peakLevel = detail.newLevel;
  const multiLevel = detail.levelsGained.length > 1;
  const hasRewards = detail.totalBonusGold > 0 || detail.totalSkillPoints > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-kid-ink/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
    >
      <KidConfetti active />
      <KidPanel className="relative w-full max-w-md text-center">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/80">
          Level up
        </p>
        <p id="level-up-title" className="mt-1 text-4xl font-extrabold text-kid-ink">
          Level {peakLevel}!
        </p>
        {multiLevel ? (
          <p className="mt-1 text-sm font-semibold text-kid-ink/85">
            You reached {detail.levelsGained.length} new levels!
          </p>
        ) : null}

        {hasRewards ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold text-kid-ink">You earned</p>
            <div className="flex flex-wrap justify-center gap-3">
              {detail.totalSkillPoints > 0 ? (
                <RewardPill
                  label={
                    detail.totalSkillPoints === 1 ? "Skill point" : "Skill points"
                  }
                  value={detail.totalSkillPoints}
                  tone="skill"
                />
              ) : null}
              {detail.totalBonusGold > 0 ? (
                <RewardPill label="Gold" value={detail.totalBonusGold} tone="coin" />
              ) : null}
            </div>
            {multiLevel && detail.payouts.length > 1 ? (
              <div className="text-left">
                <button
                  type="button"
                  className="text-sm font-bold text-kid-ink underline decoration-kid-ink/40"
                  onClick={() => setShowBreakdown((v) => !v)}
                >
                  {showBreakdown ? "Hide" : "Show"} level breakdown
                </button>
                {showBreakdown ? (
                  <ul className="mt-2 space-y-1 text-sm font-semibold text-kid-ink/90">
                    {detail.payouts.map((p) => (
                      <li key={p.level} className="flex justify-between gap-2">
                        <span>Level {p.level}</span>
                        <span className="tabular-nums">
                          +{p.skillPoints} SP, +{p.bonusGold}g
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {detail.unlockLabels.length > 0 ? (
          <div className="mt-5 text-left">
            <p className="text-sm font-extrabold uppercase tracking-wide text-kid-ink/90">
              Unlocked
            </p>
            <ul className="mt-2 space-y-1 text-base font-semibold text-kid-ink">
              {detail.unlockLabels.map((label) => (
                <li key={label}>✓ {label}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <KidButton
          type="button"
          variant="primary"
          className="mt-6 w-full text-lg"
          onClick={() => {
            playSfx("tap", muted);
            setDetail(null);
          }}
        >
          Continue
        </KidButton>
      </KidPanel>
    </div>
  );
}
