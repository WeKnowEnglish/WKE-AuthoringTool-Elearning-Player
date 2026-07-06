"use client";

import { clsx } from "clsx";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useIndividualTileEditor } from "@/components/pilots/topdown-sprites/IndividualTileEditorContext";
import { TopDownIndividualTile } from "@/components/topdown/TopDownIndividualTile";
import type { IndividualTileDef } from "@/lib/topdown/individual-tiles";
import type { SpriteCategory } from "@/lib/topdown/types";

const CATEGORY_BORDER: Record<SpriteCategory, string> = {
  grass: "border-emerald-600/50",
  soil: "border-amber-800/50",
  plant: "border-lime-600/50",
  item: "border-sky-600/50",
  weed: "border-purple-600/50",
  fence: "border-orange-600/50",
};

const ATLAS_CARD_PX = 96;

type Props = {
  tile: IndividualTileDef;
};

export function SpriteAtlasCard({ tile }: Props) {
  const { openEditor } = useIndividualTileEditor();

  return (
    <KidPanel
      className={clsx(
        "flex cursor-pointer flex-col items-center gap-2 p-3 text-center transition-colors hover:bg-kid-surface-muted/60",
        CATEGORY_BORDER[tile.category],
      )}
      onDoubleClick={() => openEditor(tile)}
      title="Double-click to edit tile layout"
    >
      <TopDownIndividualTile
        tile={tile}
        displayWidthPx={ATLAS_CARD_PX}
        alt={tile.label}
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-extrabold text-kid-ink">{tile.label}</p>
        <p className="font-mono text-[0.65rem] text-kid-ink/70">{tile.id}</p>
        <p className="text-[0.65rem] font-semibold text-kid-ink/60">
          {tile.width}×{tile.height}px
        </p>
        <p className="text-[0.65rem] font-semibold text-kid-ink/60">
          lip {tile.layout.lipOverlapPx} · col {tile.layout.columnOverlapPx}
        </p>
        <p className="text-[0.6rem] font-bold text-kid-ink/50">Double-click to edit</p>
      </div>
    </KidPanel>
  );
}
