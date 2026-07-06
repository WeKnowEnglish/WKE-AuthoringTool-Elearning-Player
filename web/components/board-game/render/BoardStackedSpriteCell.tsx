"use client";

import { clsx } from "clsx";
import { TopDownStackedAtlasTile } from "@/components/topdown/TopDownStackedAtlasTile";
import type { ResolvedBoardSprite } from "@/lib/topdown/resolve-sprite-bounds";

type Props = {
  sprite: ResolvedBoardSprite;
  /** Override display footprint; defaults to stack.layout.logicalTilePx. */
  displayPx?: number;
  className?: string;
};

export function BoardStackedSpriteCell({ sprite, displayPx, className }: Props) {
  const logicalPx = sprite.stack.layout.logicalTilePx;
  const targetPx = displayPx ?? logicalPx;
  const scale = targetPx / logicalPx;

  const tile = (
    <TopDownStackedAtlasTile
      atlas={sprite.atlas}
      bounds={sprite.bounds}
      stack={sprite.stack}
    />
  );

  if (scale === 1) {
    return <div className={clsx("overflow-visible", className)}>{tile}</div>;
  }

  return (
    <div
      className={clsx("overflow-visible", className)}
      style={{ width: targetPx, height: targetPx }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: logicalPx,
          height: logicalPx,
        }}
      >
        {tile}
      </div>
    </div>
  );
}
