"use client";

import { useState } from "react";
import { PathTilePickerModal } from "@/components/board-game/builder/PathTilePickerModal";
import { PathTileThumbnail } from "@/components/board-game/builder/PathTileThumbnail";
import { KidButton } from "@/components/kid-ui/KidButton";
import { pathTileAtSpace } from "@/lib/board-game/map/path-tile-at-cell";
import { setPathTileOverride } from "@/lib/board-game/map/path-tile-overrides";
import type { BoardMap, BoardMapSpace } from "@/lib/board-game/map/types";
import { pathTileLabel } from "@/lib/topdown/wke-path-tile-labels";

type Props = {
  map: BoardMap;
  space: BoardMapSpace;
  onChange: (map: BoardMap) => void;
};

export function PathTileEditorSection({ map, space, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const tileState = pathTileAtSpace(map, space);

  if (!tileState) return null;

  const effectiveMeta = pathTileLabel(tileState.effective);
  const autotileMeta = pathTileLabel(tileState.autotile);
  const { col, row } = space.grid;

  return (
    <div className="rounded-lg border-4 border-kid-ink bg-kid-surface-muted p-3">
      <h3 className="font-bold text-kid-ink">Path tile</h3>
      <p className="mt-0.5 text-xs font-semibold text-kid-ink/60">
        Grid cell {col}, {row}
        {tileState.isManual ? " · Manual override" : " · Autotile"}
      </p>

      <div className="mt-3 flex items-start gap-3">
        <div className="shrink-0 overflow-hidden rounded-md bg-[#3a3a3a]">
          <PathTileThumbnail tileId={tileState.effective} sizePx={72} alt={effectiveMeta.title} />
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
          Change tile…
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          disabled={!tileState.isManual}
          onClick={() => onChange(setPathTileOverride(map, col, row, null))}
        >
          Use autotile
        </KidButton>
      </div>

      <PathTilePickerModal
        open={pickerOpen}
        selectedId={tileState.effective}
        autotileId={tileState.autotile}
        onSelect={(tileId) => onChange(setPathTileOverride(map, col, row, tileId))}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
