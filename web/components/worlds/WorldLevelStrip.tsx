"use client";

import { clsx } from "clsx";
import type { ExploreAreaDiscoverySummary } from "@/lib/explore/area-discovery";
import { getExploreArea } from "@/lib/explore/areas";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import type { WorldDef } from "@/lib/worlds/types";

type Props = {
  world: WorldDef;
  /** Per-area word discovery (keyed by area id). Omit until hydrated. */
  areaDiscoveryById?: Partial<Record<ExploreAreaId, ExploreAreaDiscoverySummary>>;
  onSelectArea?: (areaId: ExploreAreaId) => void;
  className?: string;
};

function areaIdForLevel(world: WorldDef, levelIndex: number): ExploreAreaId | null {
  const level = world.levels.find((l) => l.index === levelIndex);
  if (!level) return null;
  const node = level.explorationNodes.find((n) => n.kind === "explore_area");
  return node?.kind === "explore_area" ? node.areaId : null;
}

export function WorldLevelStrip({
  world,
  areaDiscoveryById,
  onSelectArea,
  className,
}: Props) {
  return (
    <ul
      className={clsx("flex flex-wrap justify-center gap-2", className)}
      aria-label={`${world.name} areas`}
    >
      {world.levels.map((level) => {
        const areaId = areaIdForLevel(world, level.index);
        const summary = areaId ? areaDiscoveryById?.[areaId] : undefined;
        const hydrated = areaDiscoveryById !== undefined && areaId != null;
        const unlocked = summary?.unlocked ?? (areaId ? false : true);
        const percent = summary?.percent ?? 0;
        const complete = summary?.complete ?? false;
        const areaTitle = areaId ? getExploreArea(areaId).title : level.title;

        const label =
          hydrated ?
            complete ?
              `${areaTitle}, complete`
            : unlocked ?
              `${areaTitle}, ${percent}% words found`
            : `${areaTitle}, locked`
          : `${level.title}`;

        return (
          <li key={level.id}>
            <button
              type="button"
              disabled={!onSelectArea || !areaId || (hydrated && !unlocked)}
              title={`${level.title}: ${level.subtitle}`}
              aria-label={label}
              className={clsx(
                "flex min-w-[4.5rem] flex-col items-center rounded-lg border-2 px-2 py-1.5 transition-transform [touch-action:manipulation]",
                !unlocked && hydrated ?
                  "cursor-not-allowed border-kid-ink/30 bg-neutral-100 text-kid-ink/45"
                : complete ?
                  "border-kid-ink bg-emerald-200 text-kid-ink active:scale-[0.98]"
                : percent > 0 ?
                  "border-kid-ink bg-amber-100 text-kid-ink active:scale-[0.98]"
                : "border-kid-ink/40 bg-white/80 text-kid-ink/55 active:scale-[0.98]",
                onSelectArea && areaId && unlocked && "hover:bg-kid-surface-muted",
              )}
              onClick={() => {
                if (!areaId || !onSelectArea || !unlocked) return;
                onSelectArea(areaId);
              }}
            >
              <span className="text-xs font-extrabold tabular-nums">{level.index}</span>
              {hydrated && areaId ?
                <span className="text-[10px] font-bold leading-tight">
                  {!unlocked ?
                    "Locked"
                  : complete ?
                    "Done"
                  : `${percent}%`}
                </span>
              : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
