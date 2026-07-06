"use client";

import { useEffect, useState } from "react";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  BUILDER_LAYOUTS,
  BUILDER_SPACE_COUNTS,
  BUILDER_TERRAIN_DECORATIONS,
  BUILDER_THEMES,
} from "@/lib/board-game/map/library/builder-defaults";
import type {
  BoardMap,
  MapLayoutTemplate,
  MapThemeId,
  PathTerrainDecoration,
} from "@/lib/board-game/map/types";
import { pathTerrainDecorationForMap } from "@/lib/board-game/map/path-terrain-decoration";

type Props = {
  map: BoardMap;
  onTitleChange: (title: string) => void;
  onThemeChange: (theme: MapThemeId) => void;
  onPathTerrainDecorationChange: (decoration: PathTerrainDecoration) => void;
  onRegenerate: (layoutTemplate: MapLayoutTemplate, boardLength: number) => void;
};

export function MapBuilderSettings({
  map,
  onTitleChange,
  onThemeChange,
  onPathTerrainDecorationChange,
  onRegenerate,
}: Props) {
  const boardLength = map.pathOrder.length - 1;
  const [regenLayout, setRegenLayout] = useState(map.layoutTemplate);
  const [regenLength, setRegenLength] = useState(boardLength);

  useEffect(() => {
    setRegenLayout(map.layoutTemplate);
    setRegenLength(map.pathOrder.length - 1);
  }, [map.id, map.layoutTemplate, map.pathOrder.length]);

  return (
    <KidPanel>
      <h2 className="text-lg font-bold text-kid-ink">Map Settings</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="text-sm font-semibold text-kid-ink">Title</span>
          <input
            className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
            value={map.title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-kid-ink">Theme</span>
          <select
            className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
            value={map.theme}
            onChange={(event) => onThemeChange(event.target.value as MapThemeId)}
          >
            {BUILDER_THEMES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-kid-ink">Layout template</span>
          <select
            className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
            value={regenLayout}
            onChange={(event) => setRegenLayout(event.target.value as MapLayoutTemplate)}
          >
            {BUILDER_LAYOUTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-kid-ink">Spaces (to finish)</span>
          <select
            className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
            value={regenLength}
            onChange={(event) => setRegenLength(Number(event.target.value))}
          >
            {BUILDER_SPACE_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count} spaces
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block max-w-xl">
        <span className="text-sm font-semibold text-kid-ink">Terrain decoration</span>
        <select
          className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
          value={pathTerrainDecorationForMap(map)}
          onChange={(event) =>
            onPathTerrainDecorationChange(event.target.value as PathTerrainDecoration)
          }
        >
          {BUILDER_TERRAIN_DECORATIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-semibold text-kid-ink/50">
          {
            BUILDER_TERRAIN_DECORATIONS.find(
              (option) => option.value === pathTerrainDecorationForMap(map),
            )?.description
          }
        </span>
      </label>

      <button
        type="button"
        className="mt-4 rounded-lg border-4 border-kid-ink bg-kid-surface-muted px-4 py-2 text-sm font-bold text-kid-ink hover:bg-kid-surface"
        onClick={() => {
          if (
            !window.confirm(
              "Regenerate the map? This replaces the layout and clears your square edits, path tile overrides, and terrain tile overrides.",
            )
          ) {
            return;
          }
          onRegenerate(regenLayout, regenLength);
        }}
      >
        Regenerate layout
      </button>
    </KidPanel>
  );
}
