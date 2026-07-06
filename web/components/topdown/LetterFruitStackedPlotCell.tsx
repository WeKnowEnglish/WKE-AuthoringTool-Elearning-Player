"use client";

import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { TopDownStackedIndividualTile } from "@/components/topdown/TopDownIndividualTile";
import { useOptionalLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { useResolvedPlotPresetForStage } from "@/components/pilots/topdown-sprites/PlotLayerEditorContext";
import { GARDEN_MAP_LAYOUT } from "@/lib/garden/garden-map-layout";
import {
  getLetterFruitAtlas,
  letterFruitAssetKey,
  type LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import { resolveLetterFruitSlug } from "@/lib/topdown/letter-fruit-slug";
import { getIndividualTile } from "@/lib/topdown/individual-tiles";
import { computePlotFruitPlacement } from "@/lib/topdown/plot-layer-placement";
import type { PlotBaseTileId } from "@/lib/topdown/plot-to-individual-tile";
import type { PlotFruitLayerPlacement } from "@/lib/topdown/plot-layer-types";
import type { LetterFruitSlug } from "@/lib/topdown/letter-fruit-variants";
import type { SpriteRect } from "@/lib/topdown/types";

type Props = {
  /** Live garden passes the crop slug; pilot tools fall back to LetterFruitSelectorProvider. */
  slug?: LetterFruitSlug;
  stage: LetterFruitStageId;
  bounds?: SpriteRect;
  className?: string;
  /** Highlight harvest-ready stage */
  readyGlow?: boolean;
  /** Override base soil tile — defaults to resolved preset */
  baseTileId?: PlotBaseTileId | string;
  /** Override fruit layer placement — defaults to resolved preset */
  layer?: PlotFruitLayerPlacement;
};

export function LetterFruitStackedPlotCell({
  slug: slugProp,
  stage,
  bounds: boundsOverride,
  className,
  readyGlow = false,
  baseTileId,
  layer,
}: Props) {
  const slug = resolveLetterFruitSlug(slugProp, useOptionalLetterFruitSelector()?.slug);
  const atlas = getLetterFruitAtlas(slug);
  const resolved = useResolvedPlotPresetForStage(stage, slug);
  const effectiveBaseTileId = baseTileId ?? resolved.baseTileId;
  const effectiveLayer = layer ?? resolved.layer;
  const baseTile = getIndividualTile(effectiveBaseTileId);
  const assetId = letterFruitAssetKey(slug, stage);
  const bounds = boundsOverride ?? atlas.assets[assetId];
  const placement = computePlotFruitPlacement({
    cellPx: GARDEN_MAP_LAYOUT.logicalTilePx,
    cropSw: bounds.sw,
    cropSh: bounds.sh,
    layer: effectiveLayer,
  });

  if (!baseTile) {
    return (
      <div
        className={className}
        style={{
          width: GARDEN_MAP_LAYOUT.logicalTilePx,
          height: GARDEN_MAP_LAYOUT.logicalTilePx,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: GARDEN_MAP_LAYOUT.logicalTilePx,
        height: GARDEN_MAP_LAYOUT.logicalTilePx,
      }}
    >
      <div
        className="relative overflow-visible"
        style={{
          width: GARDEN_MAP_LAYOUT.logicalTilePx,
          height: GARDEN_MAP_LAYOUT.logicalTilePx,
          filter:
            readyGlow ? "drop-shadow(0 0 8px rgba(16,185,129,0.55))" : undefined,
        }}
      >
        <TopDownStackedIndividualTile
          tile={baseTile}
          footprint={baseTile.footprint}
          layout={GARDEN_MAP_LAYOUT}
        />
        <div
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          style={{
            width: GARDEN_MAP_LAYOUT.logicalTilePx,
            height: GARDEN_MAP_LAYOUT.logicalTilePx,
          }}
        >
          <div
            className="absolute max-w-none"
            style={{ left: placement.left, top: placement.top }}
          >
            <TopDownSprite
              atlas={atlas}
              bounds={bounds}
              scale={placement.scale}
              knockOutGutter
              alt=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
