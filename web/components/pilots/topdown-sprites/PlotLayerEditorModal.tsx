"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useResolvedSpriteBounds } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { PlotLayerEditorCanvas } from "@/components/pilots/topdown-sprites/PlotLayerEditorCanvas";
import { LetterFruitLetterSelect } from "@/components/pilots/topdown-sprites/LetterFruitLetterSelect";
import { useLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { usePlotLayerEditor } from "@/components/pilots/topdown-sprites/PlotLayerEditorContext";
import {
  getLetterFruitAtlas,
  letterFruitFrameByStage,
  listLetterAFruitAssetIds,
  listLetterFruitAssetIds,
  parseLetterFruitAssetKey,
  type LetterFruitAssetKey,
  type LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import { getIndividualTile, INDIVIDUAL_TILES } from "@/lib/topdown/individual-tiles";
import {
  applyPlotLayerAlignment,
  type PlotLayerAlignment,
} from "@/lib/topdown/plot-layer-align";
import { formatLetterFruitPlotPresetExport } from "@/lib/topdown/plot-layer-export";
import type { LetterFruitPlotPicksPayload } from "@/lib/topdown/letter-fruit-plot-picks-sync";
import { isPlotLayerBaseTileId, PLOT_LAYER_BASE_TILE_IDS } from "@/lib/topdown/plot-layer-base-tiles";
import type {
  LetterFruitPlotPreset,
  PlotFruitLayerPlacement,
} from "@/lib/topdown/plot-layer-types";
import type { PlotBaseTileId } from "@/lib/topdown/plot-to-individual-tile";

const SCALE_MIN = 0.08;
const SCALE_MAX = 2;
const OFFSET_MIN = -32;
const OFFSET_MAX = 32;

const BASE_TILE_OPTIONS = INDIVIDUAL_TILES.filter((tile) =>
  isPlotLayerBaseTileId(tile.id),
);

const ALIGN_BUTTONS: { id: PlotLayerAlignment; label: string }[] = [
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function presetsEqual(a: LetterFruitPlotPreset, b: LetterFruitPlotPreset): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type FieldRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

function FieldRow({ label, value, min, max, step = 1, onChange }: FieldRowProps) {
  const bump = (delta: number) => onChange(clamp(value + delta, min, max));

  return (
    <div className="grid grid-cols-[3.25rem_1fr_2.75rem] items-center gap-1.5">
      <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-0.5">
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => bump(step < 1 ? -0.1 : -10)}
          aria-label={`Decrease ${label}`}
        >
          ⏪
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => bump(step < 1 ? -0.01 : -1)}
          aria-label={`Decrease ${label} fine`}
        >
          ◀
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 accent-kid-cta"
        />
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => bump(step < 1 ? 0.01 : 1)}
          aria-label={`Increase ${label} fine`}
        >
          ▶
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => bump(step < 1 ? 0.1 : 10)}
          aria-label={`Increase ${label}`}
        >
          ⏩
        </button>
      </div>
      <span className="text-right font-mono text-[0.65rem] font-bold tabular-nums">
        {step < 1 ? value.toFixed(2) : value}
      </span>
    </div>
  );
}

export function PlotLayerEditorModal() {
  const { slug, atlasId } = useLetterFruitSelector();
  const atlas = getLetterFruitAtlas(slug);
  const {
    editorTarget,
    closeEditor,
    openEditor,
    getPlotPreset,
    getDefaultPlotPreset,
    setPlotPreset,
    resetPlotPreset,
    clearAllPlotOverrides,
  } = usePlotLayerEditor();

  const assetIds = useMemo(() => listLetterFruitAssetIds(slug), [slug]);
  const assetIndex = editorTarget ? assetIds.indexOf(editorTarget.assetKey) : -1;

  const [draft, setDraft] = useState<LetterFruitPlotPreset | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  const defaultBounds = editorTarget
    ? atlas.assets[editorTarget.assetKey]
    : undefined;

  const bounds = useResolvedSpriteBounds(
    atlasId,
    editorTarget?.assetKey ?? assetIds[0],
    defaultBounds ?? atlas.assets[assetIds[0]],
  );

  const filePreset = editorTarget ? getDefaultPlotPreset(editorTarget.assetKey) : null;
  const livePreset = editorTarget ? getPlotPreset(editorTarget.assetKey) : null;
  const preset = draft ?? livePreset;

  useEffect(() => {
    if (!editorTarget) {
      setDraft(null);
      setStatusMessage(null);
      return;
    }
    setDraft(getPlotPreset(editorTarget.assetKey));
    setStatusMessage(null);
  }, [editorTarget, getPlotPreset]);

  const updateDraft = useCallback(
    (updater: (current: LetterFruitPlotPreset) => LetterFruitPlotPreset) => {
      if (!editorTarget) return;
      setDraft((current) => {
        const base = current ?? getPlotPreset(editorTarget.assetKey);
        const next = updater(base);
        setPlotPreset(editorTarget.assetKey, next);
        return next;
      });
    },
    [editorTarget, getPlotPreset, setPlotPreset],
  );

  const updateLayer = useCallback(
    (patch: Partial<PlotFruitLayerPlacement>) => {
      updateDraft((current) => ({
        ...current,
        layer: { ...current.layer, ...patch },
      }));
    },
    [updateDraft],
  );

  const nudgeLayer = useCallback(
    (dx: number, dy: number) => {
      updateDraft((current) => ({
        ...current,
        layer: {
          ...current.layer,
          offsetX: current.layer.offsetX + dx,
          offsetY: current.layer.offsetY + dy,
        },
      }));
    },
    [updateDraft],
  );

  const navigateAsset = useCallback(
    (delta: number) => {
      if (!editorTarget || assetIndex < 0) return;
      const nextIndex = assetIndex + delta;
      if (nextIndex < 0 || nextIndex >= assetIds.length) return;
      const nextId = assetIds[nextIndex] as LetterFruitAssetKey;
      const { stage: stageId } = parseLetterFruitAssetKey(nextId);
      openEditor({
        assetKey: nextId,
        label: `${letterFruitFrameByStage(slug)[stageId].label} on plot`,
      });
    },
    [assetIds, assetIndex, editorTarget, openEditor, slug],
  );

  useEffect(() => {
    if (!editorTarget) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeEditor();
        return;
      }

      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeLayer(-step, 0);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeLayer(step, 0);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeLayer(0, -step);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeLayer(0, step);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeEditor, editorTarget, nudgeLayer]);

  async function copyPreset() {
    if (!editorTarget || !preset) return;
    try {
      await navigator.clipboard.writeText(
        formatLetterFruitPlotPresetExport(editorTarget.assetKey, preset),
      );
      setStatusMessage("Copied preset to clipboard.");
    } catch {
      setStatusMessage("Could not copy — check browser permissions.");
    }
  }

  async function savePlotPresetsToCode() {
    if (slug !== "a") {
      setStatusMessage("Save to code is only wired for Letter A plot presets.");
      return;
    }
    setSaveBusy(true);
    setStatusMessage(null);
    try {
      const payload: LetterFruitPlotPicksPayload = {
        presets: listLetterAFruitAssetIds().map((assetKey) => ({
          assetKey,
          preset: getPlotPreset(assetKey),
        })),
      };

      const response = await fetch("/api/dev/apply-letter-fruit-plot-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        updated?: string[];
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      clearAllPlotOverrides();
      setDraft(editorTarget ? getDefaultPlotPreset(editorTarget.assetKey) : null);
      setStatusMessage(
        `Saved ${data.updated?.join(" and ")}. Hard-refresh to load committed values.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }

  function handleReset() {
    if (!editorTarget) return;
    resetPlotPreset(editorTarget.assetKey);
    setDraft(getDefaultPlotPreset(editorTarget.assetKey));
    setStatusMessage(null);
  }

  function handleDone() {
    if (editorTarget && draft) {
      setPlotPreset(editorTarget.assetKey, draft);
    }
    closeEditor();
  }

  if (!editorTarget || !preset || !filePreset) return null;

  const baseTile = getIndividualTile(preset.baseTileId);
  const dirty = !presetsEqual(preset, filePreset);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-kid-ink/60 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plot-layer-editor-title"
      onClick={closeEditor}
    >
      <KidPanel
        className="relative flex h-[min(92vh,44rem)] w-full max-w-5xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-kid-ink/15 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
              Tile layer editor
            </p>
            <h2 id="plot-layer-editor-title" className="text-lg font-extrabold text-kid-ink">
              {editorTarget.label}
            </h2>
            <p className="truncate font-mono text-xs font-semibold text-kid-ink/70">
              {editorTarget.assetKey} · letter-fruit-plot-presets.ts
              {assetIds.length > 1 ? ` · ${assetIndex + 1}/${assetIds.length}` : ""}
              {dirty ? " · edited" : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <LetterFruitLetterSelect compact />
            <button
              type="button"
              className="rounded-md border-2 border-kid-ink bg-kid-panel px-2 py-1 text-xs font-bold disabled:opacity-40"
              disabled={assetIndex <= 0}
              onClick={() => navigateAsset(-1)}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="rounded-md border-2 border-kid-ink bg-kid-panel px-2 py-1 text-xs font-bold disabled:opacity-40"
              disabled={assetIndex >= assetIds.length - 1}
              onClick={() => navigateAsset(1)}
            >
              Next →
            </button>
            <button
              type="button"
              className="rounded-md border-2 border-kid-ink bg-kid-panel px-3 py-1 text-sm font-bold"
              onClick={closeEditor}
            >
              ×
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem] lg:overflow-hidden">
          <div className="flex flex-col gap-3 border-b-2 border-kid-ink/15 p-3 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r-2">
            {baseTile ?
              <PlotLayerEditorCanvas
                baseTile={baseTile}
                bounds={bounds}
                layer={preset.layer}
                onLayerChange={(layer) => updateDraft((current) => ({ ...current, layer }))}
              />
            : <p className="text-sm font-semibold text-kid-ink/70">Unknown base tile.</p>}
          </div>

          <aside className="flex flex-col gap-3 p-3 lg:min-h-0 lg:overflow-y-auto">
            <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                Base tile
              </p>
              <select
                className="w-full rounded-md border-2 border-kid-ink bg-white px-2 py-1.5 text-sm font-semibold text-kid-ink"
                value={preset.baseTileId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  if (!isPlotLayerBaseTileId(nextId)) return;
                  updateDraft((current) => ({
                    ...current,
                    baseTileId: nextId as PlotBaseTileId,
                  }));
                }}
              >
                {BASE_TILE_OPTIONS.map((tile) => (
                  <option key={tile.id} value={tile.id}>
                    {tile.label} ({tile.id})
                  </option>
                ))}
              </select>
              <p className="text-[0.6rem] font-semibold text-kid-ink/55">
                Options: {PLOT_LAYER_BASE_TILE_IDS.join(", ")}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                Fruit stage
              </p>
              <p className="text-sm font-bold text-kid-ink">
                {letterFruitFrameByStage(slug)[preset.fruitStage].label.split(" — ").slice(-1)[0]}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                Placement
              </p>
              <FieldRow
                label="offX"
                value={preset.layer.offsetX}
                min={OFFSET_MIN}
                max={OFFSET_MAX}
                onChange={(offsetX) => updateLayer({ offsetX })}
              />
              <FieldRow
                label="offY"
                value={preset.layer.offsetY}
                min={OFFSET_MIN}
                max={OFFSET_MAX}
                onChange={(offsetY) => updateLayer({ offsetY })}
              />
              <FieldRow
                label="scale"
                value={preset.layer.scale}
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={0.01}
                onChange={(scale) => updateLayer({ scale })}
              />
              <p className="font-mono text-[0.65rem] text-kid-ink/60">
                anchor: {preset.layer.anchor}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                Align
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ALIGN_BUTTONS.map((button) => (
                  <button
                    key={button.id}
                    type="button"
                    className="rounded-md border-2 border-kid-ink bg-kid-surface-muted px-2 py-1 text-[0.65rem] font-bold text-kid-ink hover:bg-kid-panel"
                    onClick={() =>
                      updateLayer(applyPlotLayerAlignment(preset.layer, button.id))
                    }
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t-2 border-kid-ink/15 px-4 py-3">
          <div className="min-w-0 text-xs font-semibold text-kid-ink/65">
            {statusMessage ?? "Saves all 5 stages · Arrow keys nudge · Shift+arrow = 10px"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <KidButton type="button" variant="secondary" onClick={copyPreset}>
              Copy preset
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              disabled={saveBusy || slug !== "a"}
              onClick={savePlotPresetsToCode}
            >
              {saveBusy ? "Saving…" : "Save to code"}
            </KidButton>
            <KidButton type="button" variant="secondary" onClick={handleReset}>
              Reset
            </KidButton>
            <KidButton type="button" onClick={handleDone}>
              Done
            </KidButton>
          </div>
        </footer>
      </KidPanel>
    </div>
  );
}
