"use client";

import { useEffect, useState } from "react";
import { PlayerLevelBar } from "@/components/progress/PlayerLevelBar";
import { SkillTreePanel } from "@/components/progress/SkillTreePanel";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { WorldExplorationBar } from "@/components/worlds";
import { getWorldWordDiscoverySummary } from "@/lib/explore/area-discovery";
import { getExploreArea } from "@/lib/explore/areas";
import { flattenExplorationNodes, getWorld1ExplorationSummary } from "@/lib/worlds/exploration";
import { WORLD_1_SIMPLE } from "@/lib/worlds/world-1-simple";
import { getRewards } from "@/lib/progress/rewards";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { BadgeGrid } from "./BadgeGrid";

type Props = {
  experience: number;
  explorationUiKey: number;
  onRewardsChange?: () => void;
};

export function AchievementsCollectionPage({
  experience,
  explorationUiKey,
  onRewardsChange,
}: Props) {
  const hydrated = useClientHydrated();
  const [exploration, setExploration] = useState(() =>
    hydrated ? getWorld1ExplorationSummary() : null,
  );
  const [areaSummaries, setAreaSummaries] = useState(
    () => getWorldWordDiscoverySummary().areas,
  );

  useEffect(() => {
    if (!hydrated) return;
    setExploration(getWorld1ExplorationSummary());
    setAreaSummaries(getWorldWordDiscoverySummary().areas);
  }, [hydrated, explorationUiKey]);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
      <KidPanel>
        <h2 className="text-lg font-extrabold text-kid-ink">Your level</h2>
        <p className="mt-1 text-sm text-kid-ink/80">Earn XP in vocabulary sets and daily quests.</p>
        <div className="mt-3">
          <PlayerLevelBar experience={experience} />
        </div>
        <p className="mt-2 text-sm font-bold text-kid-ink">
          Skill points: <span className="tabular-nums">{getRewards().skillPoints ?? 0}</span>
        </p>
      </KidPanel>

      <KidPanel>
        <h2 className="text-lg font-extrabold text-kid-ink">Badges</h2>
        <div className="mt-3">
          <BadgeGrid />
        </div>
      </KidPanel>

      <SkillTreePanel onRewardsChange={onRewardsChange} />

      {hydrated && exploration ?
        <KidPanel>
          <h2 className="text-lg font-extrabold text-kid-ink">World exploration</h2>
          <WorldExplorationBar
            worldName={WORLD_1_SIMPLE.name}
            summary={exploration}
            className="mt-3 w-full"
          />
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm font-semibold text-kid-ink">
            {flattenExplorationNodes(WORLD_1_SIMPLE).map((node) => {
              if (node.kind !== "explore_area") return null;
              const summary = areaSummaries.find((a) => a.areaId === node.areaId);
              const area = getExploreArea(node.areaId);
              const done = summary?.complete ?? false;
              const locked = summary ? !summary.unlocked : true;
              const pct = summary?.percent ?? 0;
              return (
                <li
                  key={node.areaId}
                  className={done ? "text-emerald-800" : locked ? "text-kid-ink/45" : "text-kid-ink"}
                >
                  {done ? "✓ " : locked ? "🔒 " : "○ "}
                  {area.title}
                  {!locked ?
                    <span className="font-normal text-kid-ink/70">
                      {" "}
                      — {summary?.discoveredCount ?? 0}/{summary?.totalCount ?? area.discoveryWordIds.length}{" "}
                      words ({pct}%)
                    </span>
                  : (
                    <span className="font-normal text-kid-ink/60"> — locked</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs font-semibold text-kid-ink/65">
            {exploration.touchedCount} of {exploration.totalCount} words found in this world
          </p>
        </KidPanel>
      : null}
    </div>
  );
}
