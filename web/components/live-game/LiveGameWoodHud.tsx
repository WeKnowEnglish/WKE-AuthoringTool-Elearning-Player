"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { LiveGameResourcePool, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import {
  ENGLISH_CRAFT_ART,
  resolveCarryArt,
} from "@/lib/live-game/modes/english-craft/english-craft-art";
import {
  ENGLISH_CRAFT_BOAT_HAMMER_GOAL,
  ENGLISH_CRAFT_RESOURCE_GOALS,
  ENGLISH_CRAFT_WOOD_GOAL,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  canAffordRecipeCraftedCost,
  canAffordRecipePoolCost,
  ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
  ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
  ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";

const RESOURCE_ROWS: Array<{
  type: LiveGameResourceType;
  label: string;
  icon: string;
}> = [
  { type: "wood", label: "Wood", icon: ENGLISH_CRAFT_ART.logs },
  { type: "stone", label: "Stone", icon: ENGLISH_CRAFT_ART.stoneResource },
  { type: "wheat", label: "Wheat", icon: ENGLISH_CRAFT_ART.wheatResource },
  { type: "cotton", label: "Cotton", icon: ENGLISH_CRAFT_ART.cottonResource },
];

type ResourceHudProps = {
  pool: LiveGameResourcePool;
  carriedResourceType?: LiveGameResourceType | null;
  benchBuilt?: boolean;
  boatBuilt?: boolean;
  hammers?: number;
};

function ResourceCell({
  type,
  label,
  icon,
  count,
  goal,
  craftReady,
}: {
  type: LiveGameResourceType;
  label: string;
  icon: string;
  count: number;
  goal: number;
  craftReady: boolean;
}) {
  const progress = goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0;

  return (
    <div
      className={clsx(
        "rounded-lg border px-2 py-1.5",
        craftReady ? "border-emerald-400/70 bg-emerald-950/40" : "border-amber-300/40 bg-amber-950/50",
      )}
      aria-label={`Team ${label}: ${count} of ${goal}`}
    >
      <p className="flex items-center gap-1 text-sm font-extrabold leading-tight text-amber-50">
        <span className="relative inline-block h-5 w-5 shrink-0">
          <Image
            src={icon}
            alt=""
            fill
            className="object-contain"
            sizes="20px"
            unoptimized
            draggable={false}
          />
        </span>
        <span className="tabular-nums">
          {count}/{goal}
        </span>
      </p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-amber-950/80">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-300",
            craftReady ? "bg-emerald-400" : "bg-amber-400",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function LiveGameTeamResourceHud({
  pool,
  carriedResourceType = null,
  benchBuilt = false,
  boatBuilt = false,
  hammers = 0,
}: ResourceHudProps) {
  const canBuildBench =
    !benchBuilt && canAffordRecipePoolCost(pool, ENGLISH_CRAFT_BUILD_BENCH_RECIPE);
  const benchCosts = ENGLISH_CRAFT_BUILD_BENCH_RECIPE.poolCost;
  const canAffordHammer =
    benchBuilt &&
    !boatBuilt &&
    canAffordRecipePoolCost(pool, ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE);
  const canAffordBoat =
    benchBuilt &&
    !boatBuilt &&
    hammers >= ENGLISH_CRAFT_BOAT_HAMMER_GOAL &&
    canAffordRecipePoolCost(pool, ENGLISH_CRAFT_CRAFT_BOAT_RECIPE) &&
    canAffordRecipeCraftedCost({ benchBuilt, hammers, boat: boatBuilt, bridge: false }, ENGLISH_CRAFT_CRAFT_BOAT_RECIPE);
  const hammerCosts = ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE.poolCost;
  const boatCosts = ENGLISH_CRAFT_CRAFT_BOAT_RECIPE.poolCost;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="rounded-xl border-2 border-amber-300/60 bg-amber-950/80 px-2.5 py-2 text-amber-50 backdrop-blur-sm">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
          Team resources
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
          {RESOURCE_ROWS.map((row) => {
            const benchCost = benchCosts[row.type] ?? 0;
            const hammerCost = hammerCosts[row.type] ?? 0;
            const boatCost = boatCosts[row.type] ?? 0;
            const craftReady =
              (canBuildBench && benchCost > 0 && pool[row.type] >= benchCost) ||
              (canAffordHammer && hammerCost > 0 && pool[row.type] >= hammerCost) ||
              (canAffordBoat && boatCost > 0 && pool[row.type] >= boatCost);
            return (
              <ResourceCell
                key={row.type}
                type={row.type}
                label={row.label}
                icon={row.icon}
                count={pool[row.type]}
                goal={ENGLISH_CRAFT_RESOURCE_GOALS[row.type]}
                craftReady={craftReady}
              />
            );
          })}
        </div>
      </div>

      {benchBuilt ?
        <div
          className="flex items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-950/90 px-2.5 py-1 text-xs font-bold text-amber-100 backdrop-blur-sm"
          aria-label={`Team hammers: ${hammers} of ${ENGLISH_CRAFT_BOAT_HAMMER_GOAL}`}
        >
          <span className="relative inline-block h-4 w-4 shrink-0">
            <Image
              src={ENGLISH_CRAFT_ART.hammer}
              alt=""
              fill
              className="object-contain"
              sizes="16px"
              unoptimized
              draggable={false}
            />
          </span>
          <span className="tabular-nums">
            Hammers {hammers}/{ENGLISH_CRAFT_BOAT_HAMMER_GOAL}
          </span>
        </div>
      : null}

      {carriedResourceType ?
        <div className="flex items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-950/90 px-2.5 py-1 text-xs font-bold text-amber-100 backdrop-blur-sm">
          <span className="relative inline-block h-4 w-4 shrink-0">
            <Image
              src={resolveCarryArt(carriedResourceType)}
              alt=""
              fill
              className="object-contain"
              sizes="16px"
              unoptimized
              draggable={false}
            />
          </span>
          Carrying {carriedResourceType}
        </div>
      : null}
    </div>
  );
}

/** @deprecated Use LiveGameTeamResourceHud */
export function LiveGameTeamHud({ wood, goal = ENGLISH_CRAFT_WOOD_GOAL }: { wood: number; goal?: number }) {
  return (
    <LiveGameTeamResourceHud
      pool={{ wood, stone: 0, wheat: 0, cotton: 0 }}
    />
  );
}

type InteractProps = {
  label: string;
  disabled?: boolean;
  onInteract: () => void;
};

export function LiveGameInteractPrompt({ label, disabled, onInteract }: InteractProps) {
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <KidButton
        type="button"
        variant="accent"
        className="!min-h-11 px-5 text-sm font-extrabold"
        disabled={disabled}
        onClick={onInteract}
      >
        {label}
      </KidButton>
      <p className="text-xs font-semibold text-white/75">Press E near a resource or storage</p>
    </div>
  );
}
