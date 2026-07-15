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
  ENGLISH_CRAFT_CARRY_HUD_ICON_PX,
  ENGLISH_CRAFT_HUNGER_MAX,
  ENGLISH_CRAFT_RESOURCE_GOALS,
  ENGLISH_CRAFT_WOOD_GOAL,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  canAffordRecipeCraftedCost,
  canAffordRecipePoolCost,
  ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
  ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
  ENGLISH_CRAFT_CRAFT_BREAD_RECIPE,
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

const HOST_GRANT_HINT = "+5";

type ResourceHudProps = {
  pool: LiveGameResourcePool;
  carriedResourceType?: LiveGameResourceType | "bread" | null;
  benchBuilt?: boolean;
  boatBuilt?: boolean;
  hammers?: number;
  hungerValue?: number;
  hungerIsLow?: boolean;
  hungerIsStarving?: boolean;
  /** Host-only: click a resource cell to add +5 to the shared pool. */
  hostGrantEnabled?: boolean;
  hostGrantDisabled?: boolean;
  hostGrantingType?: LiveGameResourceType | null;
  onHostGrantResource?: (type: LiveGameResourceType) => void;
};

function ResourceCell({
  type,
  label,
  icon,
  count,
  goal,
  craftReady,
  hostGrantEnabled = false,
  hostGrantDisabled = false,
  hostGranting = false,
  onHostGrant,
}: {
  type: LiveGameResourceType;
  label: string;
  icon: string;
  count: number;
  goal: number;
  craftReady: boolean;
  hostGrantEnabled?: boolean;
  hostGrantDisabled?: boolean;
  hostGranting?: boolean;
  onHostGrant?: (type: LiveGameResourceType) => void;
}) {
  const progress = goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0;
  const interactive = hostGrantEnabled && typeof onHostGrant === "function";

  const body = (
    <>
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
      {interactive ?
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-sky-200/90">
          {hostGranting ? "Adding..." : `Tap ${HOST_GRANT_HINT}`}
        </p>
      : null}
    </>
  );

  const className = clsx(
    "rounded-lg border px-2 py-1.5 text-left",
    craftReady ? "border-emerald-400/70 bg-emerald-950/40" : "border-amber-300/40 bg-amber-950/50",
    interactive &&
      "cursor-pointer outline-none ring-offset-1 ring-offset-amber-950 transition hover:border-sky-300/80 hover:bg-sky-950/40 focus-visible:ring-2 focus-visible:ring-sky-300",
    interactive && hostGrantDisabled && "cursor-wait opacity-70",
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        disabled={hostGrantDisabled}
        onClick={() => onHostGrant?.(type)}
        aria-label={`Add 5 team ${label}. Now ${count} of ${goal}`}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={className} aria-label={`Team ${label}: ${count} of ${goal}`}>
      {body}
    </div>
  );
}

export function LiveGameTeamResourceHud({
  pool,
  carriedResourceType = null,
  benchBuilt = false,
  boatBuilt = false,
  hammers = 0,
  hungerValue = ENGLISH_CRAFT_HUNGER_MAX,
  hungerIsLow = false,
  hungerIsStarving = false,
  hostGrantEnabled = false,
  hostGrantDisabled = false,
  hostGrantingType = null,
  onHostGrantResource,
}: ResourceHudProps) {
  const canBuildBench =
    !benchBuilt && canAffordRecipePoolCost(pool, ENGLISH_CRAFT_BUILD_BENCH_RECIPE);
  const benchCosts = ENGLISH_CRAFT_BUILD_BENCH_RECIPE.poolCost;
  const canAffordHammer =
    benchBuilt &&
    !boatBuilt &&
    canAffordRecipePoolCost(pool, ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE);
  const canAffordBread =
    benchBuilt &&
    !boatBuilt &&
    canAffordRecipePoolCost(pool, ENGLISH_CRAFT_CRAFT_BREAD_RECIPE);
  const canAffordBoat =
    benchBuilt &&
    !boatBuilt &&
    hammers >= ENGLISH_CRAFT_BOAT_HAMMER_GOAL &&
    canAffordRecipePoolCost(pool, ENGLISH_CRAFT_CRAFT_BOAT_RECIPE) &&
    canAffordRecipeCraftedCost({ benchBuilt, hammers, boat: boatBuilt }, ENGLISH_CRAFT_CRAFT_BOAT_RECIPE);
  const hammerCosts = ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE.poolCost;
  const breadCosts = ENGLISH_CRAFT_CRAFT_BREAD_RECIPE.poolCost;
  const boatCosts = ENGLISH_CRAFT_CRAFT_BOAT_RECIPE.poolCost;
  const hungerProgress = Math.round((hungerValue / ENGLISH_CRAFT_HUNGER_MAX) * 100);

  return (
    <div className="flex flex-col items-end gap-2">
      <div
        className="w-full max-w-[220px] rounded-xl border-2 border-amber-300/60 bg-amber-950/80 px-2.5 py-2 text-amber-50 backdrop-blur-sm"
        aria-label={`Hunger: ${hungerValue} of ${ENGLISH_CRAFT_HUNGER_MAX}`}
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
          Hunger
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-amber-950/80">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-300",
              hungerIsStarving ? "bg-red-500"
              : hungerIsLow ? "bg-yellow-400"
              : "bg-emerald-400",
            )}
            style={{ width: `${hungerProgress}%` }}
          />
        </div>
        <p className="mt-1 text-xs font-bold tabular-nums text-amber-100">
          {hungerValue}/{ENGLISH_CRAFT_HUNGER_MAX}
          {hungerIsStarving ?
            <span className="ml-1 text-red-300">Starving</span>
          : hungerIsLow ?
            <span className="ml-1 text-yellow-200">Hungry</span>
          : null}
        </p>
      </div>

      <div className="rounded-xl border-2 border-amber-300/60 bg-amber-950/80 px-2.5 py-2 text-amber-50 backdrop-blur-sm">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
          Team resources
          {hostGrantEnabled ? <span className="ml-1 text-sky-200/90">(host +5)</span> : null}
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
          {RESOURCE_ROWS.map((row) => {
            const benchCost = benchCosts[row.type] ?? 0;
            const hammerCost = hammerCosts[row.type] ?? 0;
            const breadCost = breadCosts[row.type] ?? 0;
            const boatCost = boatCosts[row.type] ?? 0;
            const craftReady =
              (canBuildBench && benchCost > 0 && pool[row.type] >= benchCost) ||
              (canAffordHammer && hammerCost > 0 && pool[row.type] >= hammerCost) ||
              (canAffordBread && breadCost > 0 && pool[row.type] >= breadCost) ||
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
                hostGrantEnabled={hostGrantEnabled}
                hostGrantDisabled={hostGrantDisabled || hostGrantingType != null}
                hostGranting={hostGrantingType === row.type}
                onHostGrant={onHostGrantResource}
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
        <div className="flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-950/90 px-2.5 py-1 text-xs font-bold text-amber-100 backdrop-blur-sm">
          <span
            className="relative inline-block shrink-0"
            style={{ width: ENGLISH_CRAFT_CARRY_HUD_ICON_PX, height: ENGLISH_CRAFT_CARRY_HUD_ICON_PX }}
          >
            <Image
              src={resolveCarryArt(carriedResourceType)}
              alt=""
              fill
              className="object-contain"
              sizes={`${ENGLISH_CRAFT_CARRY_HUD_ICON_PX}px`}
              unoptimized
              draggable={false}
            />
          </span>
          <span>Holding {carriedResourceType}</span>
        </div>
      : null}
    </div>
  );
}

/** @deprecated Use LiveGameTeamResourceHud */
export function LiveGameTeamHud({ wood, goal: _goal = ENGLISH_CRAFT_WOOD_GOAL }: { wood: number; goal?: number }) {
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
    <div className="pointer-events-auto flex max-w-[min(100%,22rem)] items-center gap-2 rounded-2xl border-2 border-white/20 bg-black/60 p-2 backdrop-blur-sm">
      <KidButton
        type="button"
        variant="accent"
        className="!min-h-14 !min-w-32 touch-manipulation px-5 text-base font-extrabold shadow-lg"
        disabled={disabled}
        onClick={onInteract}
        aria-label={`Interact: ${label}`}
      >
        <span className="sm:hidden">Interact</span>
        <span className="hidden sm:inline">{label}</span>
      </KidButton>
      <p className="min-w-0 text-xs font-semibold text-white/85">
        <span className="sm:hidden">{disabled ? "Move closer to something" : label}</span>
        <span className="hidden sm:inline">Press E near a resource or storage</span>
      </p>
    </div>
  );
}
