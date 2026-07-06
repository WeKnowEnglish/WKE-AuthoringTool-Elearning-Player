"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import {
  computeStackedSpritePlacement,
  columnStridePx,
  rowStridePx,
} from "@/lib/topdown/stacked-individual-layout";
import {
  lipRegionInCrop,
  walkToTileRect,
  type AtlasTileStackPreset,
} from "@/lib/topdown/atlas-tile-layout";
import { atlasCropLayerStyle } from "@/lib/topdown/sprite-utils";
import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

type AtlasRef = Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">;

type StackedProps = {
  atlas: AtlasRef;
  bounds: SpriteRect;
  stack: AtlasTileStackPreset;
  knockOutGutter?: boolean;
};

export function TopDownStackedAtlasTile({
  atlas,
  bounds,
  stack,
  knockOutGutter = false,
}: StackedProps) {
  const placement = computeStackedSpritePlacement(
    bounds.sw,
    bounds.sh,
    walkToTileRect(stack.walk),
    stack.layout.logicalTilePx,
  );

  return (
    <div
      className="relative overflow-visible"
      style={{
        width: stack.layout.logicalTilePx,
        height: stack.layout.logicalTilePx,
      }}
    >
      <div
        className="absolute max-w-none"
        style={{
          left: placement.offsetX,
          top: placement.offsetY,
          width: Math.round(bounds.sw * placement.scale),
          height: Math.round(bounds.sh * placement.scale),
        }}
        aria-hidden
      >
        {knockOutGutter ?
          <TopDownSprite
            atlas={atlas}
            bounds={bounds}
            knockOutGutter
            scale={placement.scale}
            alt=""
          />
        : <div
            className="absolute left-0 top-0 bg-no-repeat"
            style={atlasCropLayerStyle(atlas, bounds, placement.scale)}
          />
        }
      </div>
    </div>
  );
}

type OutlineProps = {
  atlas: AtlasRef;
  bounds: SpriteRect;
  stack: AtlasTileStackPreset;
  displayPx?: number;
  showOutlines?: boolean;
  className?: string;
  knockOutGutter?: boolean;
};

export function AtlasTileOutlinePreview({
  atlas,
  bounds,
  stack,
  displayPx = 160,
  showOutlines = true,
  className,
  knockOutGutter = false,
}: OutlineProps) {
  const scale = displayPx / bounds.sw;
  const displayH = Math.round(bounds.sh * scale);
  const lip = lipRegionInCrop(stack, bounds.sh, bounds.sw);
  const walk = stack.walk;

  return (
    <div
      className={clsx("relative inline-block shrink-0", className)}
      style={{ width: displayPx, height: displayH }}
    >
      <TopDownSprite
        atlas={atlas}
        bounds={bounds}
        fillCell
        fillScale={scale}
        knockOutGutter={knockOutGutter}
        alt=""
        className="h-full w-full"
      />

      {showOutlines ?
        <>
          <div
            className="pointer-events-none absolute border-2 border-lime-400/90"
            style={{
              left: walk.insetX * scale,
              top: walk.insetY * scale,
              width: walk.width * scale,
              height: walk.height * scale,
            }}
            title="walk surface"
          />
          {lip ?
            <div
              className="pointer-events-none absolute border-t-2 border-dashed border-orange-400 bg-orange-400/20"
              style={{
                left: 0,
                top: lip.y * scale,
                width: displayPx,
                height: lip.h * scale,
              }}
              title="lip band"
            />
          : null}
        </>
      : null}
    </div>
  );
}

const DEMO_GRID = 4;

export function AtlasTileStackedGridPreview({
  atlas,
  bounds,
  stack,
  knockOutGutter = false,
}: StackedProps) {
  const rowStride = rowStridePx(stack.layout);
  const colStride = columnStridePx(stack.layout);

  return (
    <div
      className="w-fit overflow-visible"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${DEMO_GRID}, ${colStride}px)`,
        gridAutoRows: `${rowStride}px`,
        gap: 0,
      }}
    >
      {Array.from({ length: DEMO_GRID * DEMO_GRID }, (_, index) => (
        <div key={index} style={{ zIndex: Math.floor(index / DEMO_GRID) }}>
          <TopDownStackedAtlasTile
            atlas={atlas}
            bounds={bounds}
            stack={stack}
            knockOutGutter={knockOutGutter}
          />
        </div>
      ))}
    </div>
  );
}
