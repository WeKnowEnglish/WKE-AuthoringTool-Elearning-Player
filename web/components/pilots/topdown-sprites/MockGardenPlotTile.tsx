"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { useResolvedSpriteBounds } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import {
  EMPTY_PLOT_SPRITE,
  PLANT_STAGE_SPRITES,
  spriteScaleToWidth,
  WEED_MONSTER_SPRITE,
} from "@/lib/topdown";
import {
  PREVIEW_PLOT_DISPLAY_PX,
  type MockPlotState,
} from "@/lib/topdown/preview-mock-data";
import type { SpriteRect } from "@/lib/topdown/types";

type Props = {
  state: MockPlotState;
  waterMode?: boolean;
  fertilizeMode?: boolean;
};

function assetIdForState(state: MockPlotState): string {
  switch (state) {
    case "empty":
    case "selected_empty":
      return "soil_tilled";
    case "sprout":
      return "plant_sprout";
    case "growing":
    case "watered_growing":
      return "plant_growing";
    case "ready":
    case "ready_fertilized":
    case "ready_weed":
      return "plant_ready";
  }
}

function baseBoundsForState(state: MockPlotState): SpriteRect {
  switch (state) {
    case "empty":
    case "selected_empty":
      return EMPTY_PLOT_SPRITE;
    case "sprout":
      return PLANT_STAGE_SPRITES.sprout;
    case "growing":
    case "watered_growing":
      return PLANT_STAGE_SPRITES.growing;
    case "ready":
    case "ready_fertilized":
    case "ready_weed":
      return PLANT_STAGE_SPRITES.ready;
  }
}

function overlayTextForState(state: MockPlotState): string | null {
  switch (state) {
    case "sprout":
      return "42s";
    case "growing":
      return "18s";
    case "watered_growing":
      return "💧 18s";
    case "ready":
      return "Tap!";
    case "ready_fertilized":
      return "🧪 Tap!";
    case "ready_weed":
      return "Weed!";
    default:
      return null;
  }
}

function ariaLabelForState(state: MockPlotState): string {
  switch (state) {
    case "empty":
      return "Empty plot — preview";
    case "selected_empty":
      return "Selected empty plot — preview";
    case "sprout":
      return "Sprout stage crop — preview";
    case "growing":
      return "Growing crop — preview";
    case "watered_growing":
      return "Watered growing crop — preview";
    case "ready":
      return "Ready crop — preview";
    case "ready_fertilized":
      return "Fertilized ready crop — preview";
    case "ready_weed":
      return "Ready crop blocked by weed — preview";
  }
}

export function MockGardenPlotTile({ state, waterMode, fertilizeMode }: Props) {
  const fallback = baseBoundsForState(state);
  const baseBounds = useResolvedSpriteBounds("garden", assetIdForState(state), fallback);
  const weedBounds = useResolvedSpriteBounds("garden", "weed_monster", WEED_MONSTER_SPRITE);
  const plotScale = spriteScaleToWidth(baseBounds, PREVIEW_PLOT_DISPLAY_PX);
  const overlayText = overlayTextForState(state);
  const showWeed = state === "ready_weed";
  const isReady = state === "ready" || state === "ready_fertilized" || state === "ready_weed";
  const isGrowing = state === "sprout" || state === "growing" || state === "watered_growing";
  const canWater = Boolean(waterMode) && isGrowing && state !== "watered_growing";
  const canFertilize = Boolean(fertilizeMode) && isGrowing;

  return (
    <div
      className={clsx(
        "relative aspect-square w-full overflow-hidden rounded-lg border-4 border-kid-ink/40",
        state === "empty" && "bg-[#8b5a2b]/30",
        state !== "empty" && "bg-[#6b8e23]/25",
        isReady && !showWeed && "border-emerald-700 bg-emerald-100/60 shadow-[0_0_12px_rgba(16,185,129,0.45)]",
        showWeed && "border-lime-700 bg-lime-100/60 shadow-[0_0_12px_rgba(132,204,22,0.45)]",
        canWater && "border-sky-600 bg-sky-100/50 ring-2 ring-sky-400/60",
        canFertilize && "border-amber-600 bg-amber-100/50 ring-2 ring-amber-400/60",
        state === "watered_growing" && "border-sky-500/70",
        state === "ready_fertilized" && "border-amber-600/80",
        state === "selected_empty" && "ring-4 ring-[#0f4ecf] ring-offset-2",
      )}
      aria-label={ariaLabelForState(state)}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <TopDownSprite
          bounds={baseBounds}
          scale={plotScale}
          alt=""
          className={clsx(isReady && !showWeed && "animate-pulse")}
        />
      </div>

      {showWeed ?
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <TopDownSprite
            bounds={weedBounds}
            scale={plotScale * 0.85}
            alt="Weed monster"
          />
        </div>
      : null}

      {overlayText ?
        <span
          className={clsx(
            "absolute bottom-0.5 left-0 right-0 text-center text-[0.65rem] font-bold sm:text-xs",
            isReady && !showWeed && "font-extrabold uppercase text-emerald-800",
            showWeed && "font-extrabold uppercase text-lime-800",
            !isReady && "text-kid-ink/80",
          )}
        >
          {overlayText}
        </span>
      : null}
    </div>
  );
}
