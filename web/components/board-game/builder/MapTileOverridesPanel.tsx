"use client";

import { PathTileThumbnail } from "@/components/board-game/builder/PathTileThumbnail";
import { TerrainTileThumbnail } from "@/components/board-game/builder/TerrainTileThumbnail";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  clearPathTileOverrides,
  countPathTileOverrides,
  listPathTileOverrides,
} from "@/lib/board-game/map/path-tile-overrides";
import {
  clearTerrainTileOverrides,
  countTerrainTileOverrides,
  listTerrainTileOverrides,
} from "@/lib/board-game/map/terrain-tile-overrides";
import type { BoardMap } from "@/lib/board-game/map/types";
import { pathTileLabel } from "@/lib/topdown/wke-path-tile-labels";
import { terrainTileLabel } from "@/lib/topdown/wke-terrain-tile-labels";
import type { WkePathTileId, WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

type Props = {
  map: BoardMap;
  onChange: (map: BoardMap) => void;
  onSelectSpaceId: (spaceId: number) => void;
};

function spaceLabelForEntry(
  map: BoardMap,
  entry: { pathIndex?: number; spaceLabel?: string; col: number; row: number },
): string {
  if (entry.pathIndex !== undefined) {
    if (entry.pathIndex === 0) return "START";
    if (entry.pathIndex === map.pathOrder.length - 1) return "FINISH";
    return entry.spaceLabel || `Space ${entry.pathIndex}`;
  }
  return `Cell ${entry.col}, ${entry.row}`;
}

export function MapTileOverridesPanel({ map, onChange, onSelectSpaceId }: Props) {
  const pathOverrides = listPathTileOverrides(map);
  const terrainOverrides = listTerrainTileOverrides(map);
  const pathCount = countPathTileOverrides(map);
  const terrainCount = countTerrainTileOverrides(map);

  function handleResetPath() {
    if (pathCount === 0) return;
    if (
      !window.confirm(
        `Reset all ${pathCount} manual path tile${pathCount === 1 ? "" : "s"}? Every cell will use autotile again.`,
      )
    ) {
      return;
    }
    onChange(clearPathTileOverrides(map));
  }

  function handleResetTerrain() {
    if (terrainCount === 0) return;
    if (
      !window.confirm(
        `Reset all ${terrainCount} manual terrain tile${terrainCount === 1 ? "" : "s"}? Every cell will use autotile again.`,
      )
    ) {
      return;
    }
    onChange(clearTerrainTileOverrides(map));
  }

  return (
    <KidPanel className="space-y-4 p-4">
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-kid-ink">Path tile overrides</h2>
            <p className="text-sm font-semibold text-kid-ink/60">
              {pathCount === 0 ?
                "All path cells use autotile."
              : `${pathCount} manual path tile${pathCount === 1 ? "" : "s"}.`}
            </p>
          </div>
          <KidButton type="button" variant="secondary" disabled={pathCount === 0} onClick={handleResetPath}>
            Reset path tiles
          </KidButton>
        </div>

        {pathOverrides.length > 0 ?
          <OverrideList
            map={map}
            kind="path"
            entries={pathOverrides}
            onSelectSpaceId={onSelectSpaceId}
          />
        : null}
      </section>

      <section className="space-y-3 border-t-2 border-kid-ink/10 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-kid-ink">Terrain tile overrides</h2>
            <p className="text-sm font-semibold text-kid-ink/60">
              {terrainCount === 0 ?
                "All terrain cells use autotile."
              : `${terrainCount} manual terrain tile${terrainCount === 1 ? "" : "s"}.`}
            </p>
          </div>
          <KidButton
            type="button"
            variant="secondary"
            disabled={terrainCount === 0}
            onClick={handleResetTerrain}
          >
            Reset terrain tiles
          </KidButton>
        </div>

        {terrainOverrides.length > 0 ?
          <OverrideList
            map={map}
            kind="terrain"
            entries={terrainOverrides}
            onSelectSpaceId={onSelectSpaceId}
          />
        : null}
      </section>
    </KidPanel>
  );
}

function OverrideList({
  map,
  kind,
  entries,
  onSelectSpaceId,
}: {
  map: BoardMap;
  kind: "path" | "terrain";
  entries: {
    col: number;
    row: number;
    tileId: WkePathTileId | WkeTerrainTileId;
    autotileId: WkePathTileId | WkeTerrainTileId;
    pathIndex?: number;
    spaceId?: number;
    spaceLabel?: string;
  }[];
  onSelectSpaceId: (spaceId: number) => void;
}) {
  return (
    <ul className="max-h-48 space-y-2 overflow-y-auto">
      {entries.map((entry) => {
        const meta =
          kind === "path" ?
            pathTileLabel(entry.tileId as WkePathTileId)
          : terrainTileLabel(entry.tileId as WkeTerrainTileId);
        const autotileMeta =
          kind === "path" ?
            pathTileLabel(entry.autotileId as WkePathTileId)
          : terrainTileLabel(entry.autotileId as WkeTerrainTileId);
        const label = spaceLabelForEntry(map, entry);

        return (
          <li key={`${kind}-${entry.col},${entry.row}`}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border-2 border-kid-ink/25 bg-kid-surface-muted/50 p-2 text-left transition-colors hover:bg-kid-surface-muted"
              onClick={() => {
                if (entry.spaceId != null) onSelectSpaceId(entry.spaceId);
              }}
              disabled={entry.spaceId == null}
            >
              <div className="shrink-0 overflow-hidden rounded bg-[#3a3a3a]">
                {kind === "path" ?
                  <PathTileThumbnail tileId={entry.tileId as WkePathTileId} sizePx={40} alt={meta.title} />
                : <TerrainTileThumbnail tileId={entry.tileId as WkeTerrainTileId} sizePx={40} alt={meta.title} />}
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
  );
}
