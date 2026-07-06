"use client";

import { LetterFruitStackedPlotCell } from "@/components/topdown/LetterFruitStackedPlotCell";
import { TopDownStackedIndividualTile } from "@/components/topdown/TopDownIndividualTile";
import { useResolvedSpriteBounds } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { useLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { GARDEN_MAP_LAYOUT } from "@/lib/garden/garden-map-layout";
import {
  getLetterFruitAtlas,
  letterFruitAssetKey,
  type LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import { getIndividualTile } from "@/lib/topdown/individual-tiles";
import {
  PILOT_MAP_LAYOUT,
  type PilotGardenMapDef,
  type PilotMapTileId,
} from "@/lib/topdown/preview-individual-map";
import {
  columnStridePx,
  rowStridePx,
} from "@/lib/topdown/stacked-individual-layout";

function PilotMapPlotCell({
  tileId,
  fruitStage,
}: {
  tileId: PilotMapTileId;
  fruitStage: LetterFruitStageId | null;
}) {
  const { slug, atlasId } = useLetterFruitSelector();
  const atlas = getLetterFruitAtlas(slug);
  const tile = getIndividualTile(tileId);
  const assetId = fruitStage ? letterFruitAssetKey(slug, fruitStage) : null;
  const bounds = useResolvedSpriteBounds(
    atlasId,
    assetId ?? letterFruitAssetKey(slug, "seed"),
    assetId ? atlas.assets[assetId] : atlas.assets[letterFruitAssetKey(slug, "seed")],
  );

  if (!tile) {
    return (
      <div
        className="bg-red-900/40"
        style={{
          width: PILOT_MAP_LAYOUT.logicalTilePx,
          height: PILOT_MAP_LAYOUT.logicalTilePx,
        }}
        title={`Missing tile: ${tileId}`}
      />
    );
  }

  if (fruitStage && tileId === "dirt_tilled") {
    return (
      <LetterFruitStackedPlotCell
        stage={fruitStage}
        bounds={bounds}
        baseTileId="dirt_tilled"
        readyGlow={fruitStage === "ripe"}
      />
    );
  }

  return (
    <TopDownStackedIndividualTile
      tile={tile}
      footprint={tile.footprint}
      layout={GARDEN_MAP_LAYOUT}
    />
  );
}

type Props = {
  map: PilotGardenMapDef;
  className?: string;
};

export function PilotMapGrid({ map, className }: Props) {
  const cols = map.tiles[0]?.length ?? 0;
  const rows = map.tiles.length;
  const rowStride = rowStridePx(PILOT_MAP_LAYOUT);
  const colStride = columnStridePx(PILOT_MAP_LAYOUT);

  return (
    <div className={className}>
      <div
        className="mx-auto w-fit overflow-visible p-3"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${colStride}px)`,
          gridAutoRows: `${rowStride}px`,
          gap: 0,
        }}
        aria-label={`${map.title} preview`}
      >
        {map.tiles.flatMap((row, rowIndex) =>
          row.map((tileId, colIndex) => (
            <div key={`${rowIndex}-${colIndex}`} style={{ zIndex: rowIndex }}>
              <PilotMapPlotCell
                tileId={tileId}
                fruitStage={map.fruitStages?.[rowIndex]?.[colIndex] ?? null}
              />
            </div>
          )),
        )}
      </div>

      <p className="mt-3 text-center font-mono text-[0.65rem] text-kid-ink/60">
        {rows}×{cols} · logical {PILOT_MAP_LAYOUT.logicalTilePx}px · row stride {rowStride}px ·
        column stride {colStride}px
      </p>
    </div>
  );
}
