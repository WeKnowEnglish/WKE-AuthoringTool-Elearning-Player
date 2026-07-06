"use client";

import { useState } from "react";
import { TerrainTilePickerModal } from "@/components/board-game/builder/TerrainTilePickerModal";
import { TerrainTileThumbnail } from "@/components/board-game/builder/TerrainTileThumbnail";
import { KidButton } from "@/components/kid-ui/KidButton";
import { terrainTileAtSpace } from "@/lib/board-game/map/terrain-tile-at-cell";
import { setTerrainTileOverride } from "@/lib/board-game/map/terrain-tile-overrides";
import type { BoardMap, BoardMapSpace } from "@/lib/board-game/map/types";
import { terrainTileLabel } from "@/lib/topdown/wke-terrain-tile-labels";

type Props = {
  map: BoardMap;
  space: BoardMapSpace;
  onChange: (map: BoardMap) => void;
};

export function TerrainTileEditorSection({ map, space, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const tileState = terrainTileAtSpace(map, space);

  if (!tileState) return null;

  const effectiveMeta = terrainTileLabel(tileState.effective);
  const autotileMeta = terrainTileLabel(tileState.autotile);
  const { col, row } = space.grid;

  return (
    <div className="rounded-lg border-4 border-kid-ink bg-kid-surface-muted p-3">
      <h3 className="font-bold text-kid-ink">Terrain tile</h3>
      <p className="mt-0.5 text-xs font-semibold text-kid-ink/60">
        Grid cell {col}, {row}
        {tileState.isManual ? " · Manual override" : " · Autotile"}
      </p>

      <div className="mt-3 flex items-start gap-3">
        <div className="shrink-0 overflow-hidden rounded-md bg-[#3a3a3a]">
          <TerrainTileThumbnail tileId={tileState.effective} sizePx={72} alt={effectiveMeta.title} />
        </div>
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-extrabold text-kid-ink">{effectiveMeta.title}</p>
          <p className="text-xs font-semibold text-kid-ink/65">{effectiveMeta.subtitle}</p>
          <p className="font-mono text-[0.65rem] text-kid-ink/50">{tileState.effective}</p>
          <p className="text-xs font-semibold text-kid-ink/55">
            Autotile: {autotileMeta.title} · {tileState.autotile}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <KidButton type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
          Change terrain…
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          disabled={!tileState.isManual}
          onClick={() => onChange(setTerrainTileOverride(map, col, row, null))}
        >
          Use autotile
        </KidButton>
      </div>

      <TerrainTilePickerModal
        open={pickerOpen}
        selectedId={tileState.effective}
        autotileId={tileState.autotile}
        onSelect={(tileId) => onChange(setTerrainTileOverride(map, col, row, tileId))}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
