"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { GARDEN_MAP_LAYOUT } from "@/lib/garden/garden-map-layout";
import type { FarmPlot } from "@/lib/garden/types";
import { isWeedMonsterOnCooldown } from "@/lib/garden/weed-battle";
import { WEED_MONSTER_SPRITE } from "@/lib/topdown/garden-sprite-atlas";
import { computeWeedMonsterPlotPlacement } from "@/lib/topdown/weed-monster-plot";

type Props = {
  plot: FarmPlot;
  now: number;
  className?: string;
};

export function WeedMonsterPlotOverlay({ plot, now, className }: Props) {
  const placement = computeWeedMonsterPlotPlacement(GARDEN_MAP_LAYOUT.logicalTilePx);
  const onCooldown = isWeedMonsterOnCooldown(plot, now);

  return (
    <div
      className={clsx(
        "pointer-events-none absolute left-0 top-0 overflow-visible",
        onCooldown && "opacity-60",
        className,
      )}
      style={{
        width: GARDEN_MAP_LAYOUT.logicalTilePx,
        height: GARDEN_MAP_LAYOUT.logicalTilePx,
      }}
      aria-hidden
    >
      <div
        className="absolute max-w-none"
        style={{ left: placement.left, top: placement.top }}
      >
        <TopDownSprite
          bounds={WEED_MONSTER_SPRITE}
          scale={placement.scale}
          knockOutGutter
          alt=""
        />
      </div>
    </div>
  );
}
