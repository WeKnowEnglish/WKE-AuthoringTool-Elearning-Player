"use client";

import {
  BoardLayoutContext,
  useBoardLayoutRegistry,
} from "@/components/board-game/BoardLayoutContext";
import { GameBoard } from "@/components/board-game/GameBoard";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { countPathTileOverrides } from "@/lib/board-game/map/path-tile-overrides";
import { countTerrainTileOverrides } from "@/lib/board-game/map/terrain-tile-overrides";
import { pathTerrainDecorationForMap } from "@/lib/board-game/map/path-terrain-decoration";
import { formatMapMeta } from "@/lib/board-game/map/resolve-map";
import type { BoardMap } from "@/lib/board-game/map/types";

type Props = {
  map: BoardMap;
};

function MapPreviewInner({ map }: Props) {
  const pathOverrideCount = countPathTileOverrides(map);
  const terrainOverrideCount = countTerrainTileOverrides(map);
  const decoration = pathTerrainDecorationForMap(map);

  return (
    <KidPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-kid-ink">Map preview</h2>
          <p className="mt-1 text-sm font-semibold text-kid-ink/60">
            {formatMapMeta(map)} · WKE sprites on
          </p>
        </div>
        {(pathOverrideCount > 0 || terrainOverrideCount > 0) ?
          <div className="flex flex-wrap gap-2">
            {pathOverrideCount > 0 ?
              <span className="rounded-full border-2 border-amber-500 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-kid-ink">
                {pathOverrideCount} path override{pathOverrideCount === 1 ? "" : "s"}
              </span>
            : null}
            {terrainOverrideCount > 0 ?
              <span className="rounded-full border-2 border-emerald-600 bg-emerald-600/15 px-2.5 py-1 text-xs font-bold text-kid-ink">
                {terrainOverrideCount} terrain override{terrainOverrideCount === 1 ? "" : "s"}
              </span>
            : null}
          </div>
        : null}
      </div>

      <div className="mt-4 flex justify-center overflow-x-auto rounded-xl border-4 border-kid-ink bg-[#2d2d2d] p-3">
        <div className="origin-top scale-[0.52] sm:scale-[0.58] md:scale-[0.65]">
          <GameBoard mode="preview" map={map} useSpriteTiles />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-kid-ink/50">
        Terrain decoration:{" "}
        {decoration === "full-legacy" ? "full legacy pattern" : "endpoints only"}
      </p>
    </KidPanel>
  );
}

export function MapPreviewCard({ map }: Props) {
  const layout = useBoardLayoutRegistry();
  return (
    <BoardLayoutContext.Provider value={layout}>
      <MapPreviewInner map={map} />
    </BoardLayoutContext.Provider>
  );
}
