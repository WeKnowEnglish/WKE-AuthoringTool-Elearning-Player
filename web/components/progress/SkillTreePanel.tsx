"use client";

import { useCallback, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { getPlayerLevel, getRewards } from "@/lib/progress/rewards";
import {
  SKILL_BRANCH_LABELS,
  SKILL_BRANCHES,
  getSkillRank,
  getSkillRanks,
  previewSkillPurchase,
  purchaseSkillRank,
  skillsByBranch,
  type SkillId,
  type SkillPurchaseBlockReason,
} from "@/lib/skills";
import type { SkillDef } from "@/lib/skills/registry";

type Props = {
  onRewardsChange?: () => void;
};

function blockReasonLabel(
  reason: SkillPurchaseBlockReason,
  def: SkillDef,
  preview: { cost: number },
): string {
  switch (reason) {
    case "not_implemented":
      return "Coming soon";
    case "max_rank":
      return "Max rank";
    case "need_skill_points":
      return `Need ${preview.cost} SP`;
    case "level_too_low":
      return `Level ${def.minPlayerLevel}+`;
    case "requirements":
      return "Needs other skills";
    default:
      return "";
  }
}

function RankPips({ current, max }: { current: number; max: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={
            i < current ?
              "inline-block h-2.5 w-2.5 rounded-full bg-violet-600 ring-1 ring-violet-900"
            : "inline-block h-2.5 w-2.5 rounded-full border-2 border-violet-400/80 bg-white"
          }
        />
      ))}
    </span>
  );
}

function SkillNode({
  def,
  playerLevel,
  skillPoints,
  ranks,
  onPurchase,
}: {
  def: SkillDef;
  playerLevel: number;
  skillPoints: number;
  ranks: ReturnType<typeof getSkillRanks>;
  onPurchase: (id: SkillId) => void;
}) {
  const rank = getSkillRank(def.id, ranks);
  const preview = previewSkillPurchase(def.id, playerLevel, skillPoints, ranks);
  const atMax = rank >= def.maxRank;

  return (
    <li className="rounded-lg border-2 border-kid-ink/25 bg-white/90 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none" aria-hidden>
          {def.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-kid-ink">{def.label}</p>
          <p className="mt-0.5 text-xs font-medium text-kid-ink/75">{def.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RankPips current={rank} max={def.maxRank} />
            <span className="text-xs font-bold text-violet-900 tabular-nums">
              {rank}/{def.maxRank}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        {atMax ?
          <p className="text-center text-sm font-bold text-emerald-800">Fully upgraded</p>
        : preview.canBuy ?
          <KidButton
            type="button"
            variant="accent"
            className="!min-h-10 w-full !py-2 text-sm"
            onClick={() => onPurchase(def.id)}
          >
            Upgrade ({preview.cost} SP)
          </KidButton>
        : (
          <p className="text-center text-sm font-bold text-kid-ink/70">
            {blockReasonLabel(preview.reason ?? "not_implemented", def, preview)}
          </p>
        )}
      </div>
    </li>
  );
}

export function SkillTreePanel({ onRewardsChange }: Props) {
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((k) => k + 1);
    onRewardsChange?.();
  }, [onRewardsChange]);

  const { playerLevel, skillPoints, ranks } = useMemo(() => {
    void tick;
    const rewards = getRewards();
    return {
      playerLevel: getPlayerLevel(rewards),
      skillPoints: rewards.skillPoints ?? 0,
      ranks: getSkillRanks(rewards),
    };
  }, [tick]);

  const onPurchase = useCallback(
    (id: SkillId) => {
      const result = purchaseSkillRank(id, playerLevel);
      if (result.ok) refresh();
    },
    [playerLevel, refresh],
  );

  return (
    <KidPanel>
      <h2 className="text-xl font-bold text-kid-ink">Skill tree</h2>
      <p className="mt-1 text-sm text-kid-ink/80">
        Spend skill points from leveling up. Branches unlock bonuses for earning, your pet, and
        future areas.
      </p>
      <p className="mt-2 text-lg font-extrabold text-violet-950">
        Skill points: <span className="tabular-nums text-kid-ink">{skillPoints}</span>
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        {SKILL_BRANCHES.map((branch) => {
          const defs = skillsByBranch(branch);
          return (
            <section key={branch} className="flex flex-col">
              <h3 className="mb-3 text-center text-sm font-extrabold uppercase tracking-wide text-violet-900">
                {SKILL_BRANCH_LABELS[branch]}
              </h3>
              <ul className="flex flex-col gap-3">
                {defs.map((def) => (
                  <SkillNode
                    key={def.id}
                    def={def}
                    playerLevel={playerLevel}
                    skillPoints={skillPoints}
                    ranks={ranks}
                    onPurchase={onPurchase}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </KidPanel>
  );
}
