"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BoardLayoutContext,
  useBoardLayoutRegistry,
} from "@/components/board-game/BoardLayoutContext";
import { GameBoard } from "@/components/board-game/GameBoard";
import { MapBuilderSettings } from "@/components/board-game/builder/MapBuilderSettings";
import { SquareEditorPanel } from "@/components/board-game/builder/SquareEditorPanel";
import { KidButton } from "@/components/kid-ui/KidButton";
import { MAP_PRESET_CATALOG, getMapById } from "@/lib/board-game/map/default-maps";
import {
  cloneMapAsCustom,
  createMapFromOptions,
  isMapDirty,
  mapSnapshot,
  updateMapMeta,
} from "@/lib/board-game/map/library/map-mutations";
import {
  createCustomMapId,
  deleteCustomMap,
  listCustomMaps,
  saveCustomMap,
} from "@/lib/board-game/map/library/storage";
import type { BoardMap, MapLayoutTemplate, MapThemeId } from "@/lib/board-game/map/types";
import { formatMapMeta } from "@/lib/board-game/map/resolve-map";

type Props = {
  initialMapId?: string | null;
  onBack: () => void;
  onUseMap: (mapId: string) => void;
};

function MapBuilderInner({ initialMapId, onBack, onUseMap }: Props) {
  const [draftMap, setDraftMap] = useState<BoardMap>(() => createDefaultDraft(initialMapId));
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [customMaps, setCustomMaps] = useState(() => listCustomMaps());

  const dirty = useMemo(() => isMapDirty(draftMap, savedSnapshot), [draftMap, savedSnapshot]);

  useEffect(() => {
    if (initialMapId && getMapById(initialMapId)) {
      const source = getMapById(initialMapId)!;
      if (source.id.startsWith("custom-")) {
        setDraftMap(source);
        setSavedSnapshot(mapSnapshot(source));
      }
    }
  }, [initialMapId]);

  const refreshCustomMaps = useCallback(() => {
    setCustomMaps(listCustomMaps());
  }, []);

  function showStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 2500);
  }

  function handleSave() {
    try {
      const saved = saveCustomMap({
        id: draftMap.id,
        title: draftMap.title,
        map: draftMap,
      });
      setDraftMap(saved.map);
      setSavedSnapshot(mapSnapshot(saved.map));
      refreshCustomMaps();
      showStatus("Map saved.");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Could not save map.");
    }
  }

  function handleUseInSetup() {
    let mapId = draftMap.id;
    if (dirty) {
      try {
        const saved = saveCustomMap({
          id: draftMap.id,
          title: draftMap.title,
          map: draftMap,
        });
        setDraftMap(saved.map);
        setSavedSnapshot(mapSnapshot(saved.map));
        refreshCustomMaps();
        mapId = saved.id;
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Could not save map.");
        return;
      }
    }
    onUseMap(mapId);
  }

  function handleNewMap() {
    if (dirty && !window.confirm("Discard unsaved changes and create a new map?")) return;
    const next = createMapFromOptions({
      title: "My Board",
      theme: "classroom",
      layoutTemplate: "snake",
      boardLength: 20,
    });
    setDraftMap(next);
    setSavedSnapshot(null);
    setSelectedSpaceId(null);
  }

  function handleDuplicatePreset(presetId: string) {
    const source = getMapById(presetId);
    if (!source) return;
    if (dirty && !window.confirm("Replace current draft with a copy of this preset?")) return;
    const next = cloneMapAsCustom(source, `${source.title} Copy`, createCustomMapId());
    setDraftMap(next);
    setSavedSnapshot(null);
    setSelectedSpaceId(null);
  }

  function handleLoadCustom(mapId: string) {
    const record = listCustomMaps().find((entry) => entry.id === mapId);
    if (!record) return;
    if (dirty && !window.confirm("Replace current draft with this saved map?")) return;
    setDraftMap(record.map);
    setSavedSnapshot(mapSnapshot(record.map));
    setSelectedSpaceId(null);
  }

  function handleDeleteCustom(mapId: string) {
    if (!window.confirm("Delete this saved map?")) return;
    deleteCustomMap(mapId);
    refreshCustomMaps();
    if (draftMap.id === mapId) {
      setSavedSnapshot(null);
    }
  }

  function handleRegenerate(layoutTemplate: MapLayoutTemplate, boardLength: number) {
    const next = createMapFromOptions({
      id: draftMap.id.startsWith("custom-") ? draftMap.id : createCustomMapId(),
      title: draftMap.title,
      theme: draftMap.theme,
      layoutTemplate,
      boardLength,
    });
    setDraftMap(next);
    setSavedSnapshot(null);
    setSelectedSpaceId(null);
  }

  function handleBack() {
    if (dirty && !window.confirm("Leave Map Builder? Unsaved changes will be lost.")) return;
    onBack();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-kid-ink">Map Builder</h1>
          <p className="text-lg font-bold text-kid-ink/80">{draftMap.title}</p>
          <p className="text-sm font-semibold text-kid-ink/60">
            {formatMapMeta(draftMap)}
            {dirty ? " · Unsaved changes" : savedSnapshot ? " · Saved" : ""}
          </p>
          {statusMessage ? (
            <p className="mt-1 text-sm font-bold text-kid-accent">{statusMessage}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <KidButton variant="secondary" onClick={() => setPreviewMode((value) => !value)}>
            {previewMode ? "Edit mode" : "Preview"}
          </KidButton>
          <KidButton variant="secondary" onClick={handleSave}>
            Save
          </KidButton>
          <KidButton onClick={handleUseInSetup}>Use in Setup</KidButton>
          <KidButton variant="secondary" onClick={handleBack}>
            Back to Setup
          </KidButton>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <GameBoard
            mode={previewMode ? "preview" : "builder"}
            map={draftMap}
            selectedSpaceId={selectedSpaceId}
            onSpaceClick={(spaceId) => setSelectedSpaceId(spaceId)}
          />
          <MapBuilderSettings
            map={draftMap}
            onTitleChange={(title) => setDraftMap((current) => updateMapMeta(current, { title }))}
            onThemeChange={(theme) =>
              setDraftMap((current) => updateMapMeta(current, { theme: theme as MapThemeId }))
            }
            onRegenerate={handleRegenerate}
          />
        </div>

        <SquareEditorPanel
          map={draftMap}
          selectedSpaceId={selectedSpaceId}
          onChange={setDraftMap}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LibraryPanel
          title="Start from preset"
          description="Duplicate a built-in map to customize it."
          items={MAP_PRESET_CATALOG.map((preset) => ({
            id: preset.id,
            label: preset.label,
            description: preset.description,
          }))}
          actionLabel="Duplicate"
          onAction={handleDuplicatePreset}
        />

        <LibraryPanel
          title="My saved maps"
          description="Load or delete maps you created."
          activeId={draftMap.id.startsWith("custom-") ? draftMap.id : null}
          items={customMaps.map((entry) => ({
            id: entry.id,
            label: entry.title,
            description: `${entry.map.pathOrder.length - 1} spaces · ${entry.map.layoutTemplate}`,
          }))}
          actionLabel="Load"
          secondaryActionLabel="Delete"
          onAction={handleLoadCustom}
          onSecondaryAction={handleDeleteCustom}
          emptyMessage="No saved maps yet. Save your first design above."
        />
      </div>

      <div className="flex justify-center">
        <KidButton variant="secondary" onClick={handleNewMap}>
          New blank map
        </KidButton>
      </div>
    </div>
  );
}

function LibraryPanel({
  title,
  description,
  items,
  actionLabel,
  secondaryActionLabel,
  activeId,
  onAction,
  onSecondaryAction,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: { id: string; label: string; description: string }[];
  actionLabel: string;
  secondaryActionLabel?: string;
  activeId?: string | null;
  onAction: (id: string) => void;
  onSecondaryAction?: (id: string) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-2xl border-4 border-kid-ink bg-kid-panel p-4">
      <h2 className="text-lg font-bold text-kid-ink">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-kid-ink/60">{description}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm font-semibold text-kid-ink/60">{emptyMessage ?? "Nothing here yet."}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-4 px-3 py-2 ${
                activeId === item.id ?
                  "border-kid-accent bg-kid-accent/15"
                : "border-kid-ink bg-kid-surface-muted"
              }`}
            >
              <div>
                <p className="font-bold text-kid-ink">{item.label}</p>
                <p className="text-sm font-semibold text-kid-ink/60">{item.description}</p>
              </div>
              <div className="flex gap-2">
                <KidButton variant="secondary" onClick={() => onAction(item.id)}>
                  {actionLabel}
                </KidButton>
                {secondaryActionLabel && onSecondaryAction ? (
                  <KidButton variant="secondary" onClick={() => onSecondaryAction(item.id)}>
                    {secondaryActionLabel}
                  </KidButton>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function createDefaultDraft(initialMapId?: string | null): BoardMap {
  if (initialMapId) {
    const existing = getMapById(initialMapId);
    if (existing) return structuredClone(existing);
  }
  return createMapFromOptions({
    title: "My Board",
    theme: "classroom",
    layoutTemplate: "snake",
    boardLength: 20,
  });
}

export function MapBuilderApp(props: Props) {
  const layout = useBoardLayoutRegistry();
  return (
    <BoardLayoutContext.Provider value={layout}>
      <MapBuilderInner {...props} />
    </BoardLayoutContext.Provider>
  );
}
