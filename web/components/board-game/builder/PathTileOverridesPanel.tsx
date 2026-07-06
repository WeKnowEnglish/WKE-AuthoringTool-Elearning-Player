"use client";

import { PathTileThumbnail } from "@/components/board-game/builder/PathTileThumbnail";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  clearPathTileOverrides,
  countPathTileOverrides,
  listPathTileOverrides,
} from "@/lib/board-game/map/path-tile-overrides";
import type { BoardMap } from "@/lib/board-game/map/types";
import { pathTileLabel } from "@/lib/topdown/wke-path-tile-labels";

type Props = {
  map: BoardMap;
  onChange: (map: BoardMap) => void;
  onSelectSpaceId: (spaceId: number) => void;
};

export function PathTileOverridesPanel({ map, onChange, onSelectSpaceId }: Props) {
  const overrides = listPathTileOverrides(map);
  const count = countPathTileOverrides(map);

  function handleResetAll() {
    if (count === 0) return;
    if (
      !window.confirm(
        `Reset all ${count} manual path tile${count === 1 ? "" : "s"}? Every cell will use autotile again.`,
      )
    ) {
      return;
    }
    onChange(clearPathTileOverrides(map));
  }

  return (
    <KidPanel className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-kid-ink">Path tile overrides</h2>
          <p className="text-sm font-semibold text-kid-ink/60">
            {count === 0 ?
              "All path cells use autotile."
            : `${count} manual path tile${count === 1 ? "" : "s"} on this map.`}
          </p>
        </div>
        <KidButton type="button" variant="secondary" disabled={count === 0} onClick={handleResetAll}>
          Reset all to autotile
        </KidButton>
      </div>

      {overrides.length > 0 ?
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {overrides.map((entry) => {
            const meta = pathTileLabel(entry.tileId);
            const autotileMeta = pathTileLabel(entry.autotileId);
            const label =
              entry.pathIndex !== undefined ?
                entry.pathIndex === 0 ? "START"
                : entry.pathIndex === map.pathOrder.length - 1 ? "FINISH"
                : entry.spaceLabel || `Space ${entry.pathIndex}`
              : `Cell ${entry.col}, ${entry.row}`;

            return (
              <li key={`${entry.col},${entry.row}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border-2 border-kid-ink/25 bg-kid-surface-muted/50 p-2 text-left transition-colors hover:bg-kid-surface-muted"
                  onClick={() => {
                    if (entry.spaceId != null) onSelectSpaceId(entry.spaceId);
                  }}
                  disabled={entry.spaceId == null}
                  title={
                    entry.spaceId != null ?
                      "Jump to this square in the editor"
                    : "No space on this grid cell"
                  }
                >
                  <div className="shrink-0 overflow-hidden rounded bg-[#3a3a3a]">
                    <PathTileThumbnail tileId={entry.tileId} sizePx={40} alt={meta.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-kid-ink">
                      {label}
                      {entry.pathIndex !== undefined ?
                        <span className="font-normal text-kid-ink/55"> · index {entry.pathIndex}</span>
                      : null}
                    </p>
                    <p className="truncate text-xs font-semibold text-kid-ink/65">
                      {meta.title} · {entry.tileId}
                    </p>
                    <p className="truncate text-[0.65rem] font-semibold text-kid-ink/50">
                      Autotile: {autotileMeta.title}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      : null}
    </KidPanel>
  );
}
