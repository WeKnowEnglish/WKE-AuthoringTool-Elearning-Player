"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AtlasTileOutlinePreview,
  AtlasTileStackedGridPreview,
  TopDownStackedAtlasTile,
} from "@/components/topdown/TopDownStackedAtlasTile";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useBoundsOverride } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { SpriteBoundsFieldRow } from "@/components/pilots/topdown-sprites/SpriteBoundsFieldRow";
import { SpriteSheetCropCanvas, type SpriteBoundsChangeMeta } from "@/components/pilots/topdown-sprites/SpriteSheetCropCanvas";
import { TileStackEditorCanvas } from "@/components/pilots/topdown-sprites/TileStackEditorCanvas";
import { getPreviewAtlasEntry } from "@/lib/topdown/atlas-registry";
import {
  getLetterFruitAtlas,
  listLetterAFruitAssetIds,
  listLetterFruitAssetIds,
} from "@/lib/topdown/letter-fruit-atlas";
import {
  isLetterFruitAtlasId,
  letterFruitSlugFromAtlasId,
} from "@/lib/topdown/letter-fruit-variants";
import type { LetterFruitPicksPayload } from "@/lib/topdown/letter-fruit-picks-sync";
import {
  applyLetterFruit3dLip,
  letterFruitStackHas3dLip,
} from "@/lib/topdown/letter-fruit-stack";
import {
  clampStackPresetToCrop,
  formatAtlasBoundsExport,
  formatAtlasFullTileExport,
  lipRegionInCrop,
  resolveStackPresetForCrop,
  updateWalkInPreset,
  walkBottom,
  type AtlasTileStackPreset,
  type AtlasTileWalk,
  type StackPresetResolveSource,
} from "@/lib/topdown/atlas-tile-layout";
import {
  bumpSpriteRectField,
  clampSpriteRect,
  rectsEqual,
  type BoundsField,
} from "@/lib/topdown/bounds-editor-utils";
import {
  columnStridePx,
  rowStridePx,
  type TileLayoutPreset,
} from "@/lib/topdown/stacked-individual-layout";
import type { SpriteRect } from "@/lib/topdown/types";

const CHECKER_BG = {
  backgroundImage:
    "linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
} as const;

function ViewportCard({
  title,
  hint,
  checker = false,
  children,
}: {
  title: string;
  hint?: string;
  checker?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border-2 border-kid-ink/20 bg-kid-surface-muted/30 p-2.5">
      <div>
        <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">{title}</p>
        {hint ?
          <p className="text-[0.6rem] font-semibold text-kid-ink/55">{hint}</p>
        : null}
      </div>
      <div
        className={clsx(
          "flex items-center justify-center overflow-auto rounded-md p-2",
          !checker && "bg-[#3a3a3a]",
        )}
        style={checker ? CHECKER_BG : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function TileFieldRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr_2rem] items-center gap-1">
      <span className="text-[0.6rem] font-extrabold uppercase text-kid-ink/70">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-kid-cta"
      />
      <span className="text-right font-mono text-[0.65rem] font-bold tabular-nums">{value}</span>
    </div>
  );
}

export function SpriteBoundsEditorModal() {
  const {
    editorTarget,
    closeEditor,
    openEditor,
    getBounds,
    setBounds,
    resetBounds,
    getDefaultBounds,
    getStackPreset,
    setStackPreset,
    resetStackPreset,
    getDefaultStackPreset,
  } = useBoundsOverride();

  const entry = editorTarget ? getPreviewAtlasEntry(editorTarget.atlasId) : undefined;
  const defaultBounds = editorTarget
    ? getDefaultBounds(editorTarget.atlasId, editorTarget.assetId)
    : undefined;

  const assetIds = useMemo(
    () => (entry ? Object.keys(entry.atlas.assets) : []),
    [entry],
  );
  const assetIndex = editorTarget ? assetIds.indexOf(editorTarget.assetId) : -1;

  const liveBounds = useMemo(() => {
    if (!editorTarget || !defaultBounds) return null;
    return getBounds(editorTarget.atlasId, editorTarget.assetId, defaultBounds);
  }, [defaultBounds, editorTarget, getBounds]);

  const [draftBounds, setDraftBounds] = useState<SpriteRect | null>(null);
  const [draftStack, setDraftStack] = useState<AtlasTileStackPreset | null>(null);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const bounds = draftBounds ?? liveBounds;

  const fileStack = useMemo(() => {
    if (!editorTarget || !bounds) return null;
    return getDefaultStackPreset(editorTarget.atlasId, editorTarget.assetId, bounds);
  }, [bounds, editorTarget, getDefaultStackPreset]);

  const liveStack = useMemo(() => {
    if (!editorTarget || !bounds) return null;
    return getStackPreset(editorTarget.atlasId, editorTarget.assetId, bounds);
  }, [bounds, editorTarget, getStackPreset]);

  const stack = draftStack ?? liveStack;
  const stackForResolveRef = useRef<AtlasTileStackPreset | null>(null);
  stackForResolveRef.current = stack;

  useEffect(() => {
    if (!editorTarget || !defaultBounds) {
      setDraftBounds(null);
      setDraftStack(null);
      setDetectStatus(null);
      return;
    }
    const nextBounds = getBounds(editorTarget.atlasId, editorTarget.assetId, defaultBounds);
    setDraftBounds(nextBounds);
    setDraftStack(getStackPreset(editorTarget.atlasId, editorTarget.assetId, nextBounds));
    setDetectStatus(null);
    setSaveStatus(null);
  }, [defaultBounds, editorTarget, getBounds, getStackPreset]);

  useEffect(() => {
    if (!editorTarget) return;
    const target = editorTarget;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeEditor();
      if (e.key === "ArrowLeft" && assetIndex > 0) {
        e.preventDefault();
        const prevId = assetIds[assetIndex - 1];
        if (prevId) openEditor({ atlasId: target.atlasId, assetId: prevId, label: prevId });
      }
      if (e.key === "ArrowRight" && assetIndex >= 0 && assetIndex < assetIds.length - 1) {
        e.preventDefault();
        const nextId = assetIds[assetIndex + 1];
        if (nextId) openEditor({ atlasId: target.atlasId, assetId: nextId, label: nextId });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [assetIds, assetIndex, closeEditor, editorTarget, openEditor]);

  const applyBounds = useCallback(
    (next: SpriteRect, meta?: SpriteBoundsChangeMeta) => {
      if (!editorTarget || !entry || !bounds) return;
      const previousCrop = bounds;
      const clamped = clampSpriteRect(next, entry.atlas.width, entry.atlas.height);
      const sizeChanged =
        previousCrop.sw !== clamped.sw || previousCrop.sh !== clamped.sh;

      let resolveSource: StackPresetResolveSource;
      if (meta?.source === "detect") {
        resolveSource = "detect";
      } else if (sizeChanged) {
        resolveSource = "manual-crop";
      } else {
        resolveSource = "manual-walk";
      }

      const filePreset = getDefaultStackPreset(
        editorTarget.atlasId,
        editorTarget.assetId,
        clamped,
      );
      const sessionPreset =
        stackForResolveRef.current ??
        getStackPreset(editorTarget.atlasId, editorTarget.assetId, previousCrop);
      const nextStack = resolveStackPresetForCrop({
        source: resolveSource,
        crop: clamped,
        canonicalBounds: defaultBounds,
        filePreset,
        sessionPreset,
        previousCrop,
      });

      setDraftBounds(clamped);
      setBounds(editorTarget.atlasId, editorTarget.assetId, clamped);
      setDraftStack(nextStack);
      setStackPreset(editorTarget.atlasId, editorTarget.assetId, clamped, nextStack);
    },
    [
      bounds,
      defaultBounds,
      editorTarget,
      entry,
      getDefaultStackPreset,
      getStackPreset,
      setBounds,
      setStackPreset,
    ],
  );

  const applyStack = useCallback(
    (next: AtlasTileStackPreset) => {
      if (!editorTarget || !bounds) return;
      setDraftStack(next);
      setStackPreset(editorTarget.atlasId, editorTarget.assetId, bounds, next);
    },
    [bounds, editorTarget, setStackPreset],
  );

  const updateWalk = useCallback(
    (patch: Partial<AtlasTileWalk>) => {
      if (!stack || !bounds) return;
      applyStack(updateWalkInPreset(stack, patch, bounds.sw, bounds.sh));
    },
    [applyStack, bounds, stack],
  );

  const updateLipStartY = useCallback(
    (lipStartY: number) => {
      if (!stack || !bounds) return;
      applyStack(
        clampStackPresetToCrop(
          { ...stack, lipStartY },
          bounds.sw,
          bounds.sh,
        ),
      );
    },
    [applyStack, bounds, stack],
  );

  const updateLayout = useCallback(
    (patch: Partial<TileLayoutPreset>) => {
      if (!stack) return;
      applyStack({
        ...stack,
        layout: {
          ...stack.layout,
          ...patch,
        },
      });
    },
    [applyStack, stack],
  );

  const bumpField = useCallback(
    (field: BoundsField, delta: number) => {
      if (!bounds || !entry) return;
      applyBounds(bumpSpriteRectField(bounds, field, delta, entry.atlas.width, entry.atlas.height));
    },
    [applyBounds, bounds, entry],
  );

  async function copyExport() {
    if (!editorTarget || !bounds || !stack) return;
    try {
      await navigator.clipboard.writeText(formatAtlasFullTileExport(editorTarget.assetId, bounds, stack));
    } catch {
      // clipboard may be blocked
    }
  }

  async function copyBoundsExport() {
    if (!editorTarget || !bounds) return;
    try {
      await navigator.clipboard.writeText(formatAtlasBoundsExport(editorTarget.assetId, bounds));
    } catch {
      // clipboard may be blocked
    }
  }

  const toggleLetterFruit3dLip = useCallback(
    (enabled: boolean) => {
      if (!editorTarget) return;
      const slug = letterFruitSlugFromAtlasId(editorTarget.atlasId);
      if (!slug) return;

      const atlasId = editorTarget.atlasId;
      const atlas = getLetterFruitAtlas(slug);
      for (const assetId of listLetterFruitAssetIds(slug)) {
        const fallback = atlas.assets[assetId];
        const crop = getBounds(atlasId, assetId, fallback);
        const currentStack = getStackPreset(atlasId, assetId, crop);
        const nextStack = applyLetterFruit3dLip(
          currentStack,
          crop.sw,
          crop.sh,
          enabled,
        );
        setStackPreset(atlasId, assetId, crop, nextStack);
        if (assetId === editorTarget.assetId) {
          setDraftStack(nextStack);
        }
      }
      setSaveStatus(null);
    },
    [editorTarget, getBounds, getStackPreset, setStackPreset],
  );

  async function saveLetterFruitToCode() {
    if (!editorTarget) return;
    const slug = letterFruitSlugFromAtlasId(editorTarget.atlasId);
    if (slug !== "a") {
      setSaveStatus("Save to code is only wired for Letter A bounds.");
      return;
    }
    setSaveBusy(true);
    setSaveStatus(null);
    try {
      const atlasId = editorTarget.atlasId;
      const atlas = getLetterFruitAtlas("a");
      const payload: LetterFruitPicksPayload = {
        tiles: listLetterAFruitAssetIds().map((assetId) => {
          const fallback = atlas.assets[assetId];
          const crop = getBounds(atlasId, assetId, fallback);
          return {
            assetId,
            bounds: crop,
            stack: getStackPreset(atlasId, assetId, crop),
          };
        }),
      };

      const response = await fetch("/api/dev/apply-letter-fruit-picks", {
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
      setSaveStatus(
        `Saved ${data.updated?.join(" and ")}. Hard-refresh if previews look stale.`,
      );
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }

  function navigateAsset(delta: -1 | 1) {
    if (!editorTarget || assetIndex < 0) return;
    const nextId = assetIds[assetIndex + delta];
    if (!nextId) return;
    openEditor({ atlasId: editorTarget.atlasId, assetId: nextId, label: nextId });
  }

  const stackPresetPath =
    entry?.stackPresetPath ?? "lib/topdown/wke-terrain-tile-presets.ts";

  if (!editorTarget || !entry || !defaultBounds || !bounds || !stack || !fileStack) return null;

  const boundsDirty = !rectsEqual(bounds, defaultBounds);
  const stackDirty = JSON.stringify(stack) !== JSON.stringify(fileStack);
  const rowStride = rowStridePx(stack.layout);
  const colStride = columnStridePx(stack.layout);
  const lip = lipRegionInCrop(stack, bounds.sh, bounds.sw);
  const exportText = formatAtlasFullTileExport(editorTarget.assetId, bounds, stack);
  const boundsExportText = formatAtlasBoundsExport(editorTarget.assetId, bounds);
  const minLipY = walkBottom(stack.walk);
  const gardenOverlayEditor = editorTarget.atlasId === "garden";
  const letterFruitEditor = isLetterFruitAtlasId(editorTarget.atlasId);
  const letterFruitSlug = letterFruitSlugFromAtlasId(editorTarget.atlasId);
  const transparentPreview = gardenOverlayEditor || letterFruitEditor;
  const has3dLip = letterFruitEditor
    ? letterFruitStackHas3dLip(stack, bounds.sh)
    : true;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-kid-ink/60 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sprite-bounds-editor-title"
      onClick={closeEditor}
    >
      <KidPanel
        className="relative flex h-[min(96vh,56rem)] w-full max-w-7xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-kid-ink/15 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
              Atlas bounds editor
            </p>
            <h2 id="sprite-bounds-editor-title" className="text-lg font-extrabold text-kid-ink">
              {editorTarget.label}
            </h2>
            <p className="truncate font-mono text-xs font-semibold text-kid-ink/70">
              {editorTarget.assetId} · {entry.configPath}
              {assetIds.length > 1 ? ` · ${assetIndex + 1}/${assetIds.length}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {assetIds.length > 1 ?
              <>
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
              </>
            : null}
            <button
              type="button"
              className="rounded-md border-2 border-kid-ink bg-kid-panel px-3 py-1 text-sm font-bold"
              onClick={closeEditor}
            >
              ×
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
          <div className="flex flex-col gap-3 overflow-visible p-3 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r-2 border-b-2 border-kid-ink/15">
            <div className="flex max-h-[min(48vh,28rem)] min-h-[240px] shrink-0 flex-col gap-2 rounded-lg border-2 border-kid-ink/20 bg-kid-surface-muted/30 p-2.5">
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                  Sheet crop
                </p>
                <p className="text-[0.6rem] font-semibold text-kid-ink/55">
                  Click a tile to auto-detect · opens snapped on each asset
                </p>
              </div>
              <SpriteSheetCropCanvas
                atlas={entry.atlas}
                bounds={bounds}
                onChange={applyBounds}
                onDetectStatus={setDetectStatus}
                focusKey={`${editorTarget.atlasId}:${editorTarget.assetId}`}
                atlasId={editorTarget.atlasId}
                canonicalBounds={defaultBounds}
                viewportMinHeight={260}
              />
              {detectStatus ?
                <p className="shrink-0 text-xs font-semibold text-sky-800">{detectStatus}</p>
              : null}
            </div>

            <div className="shrink-0 space-y-3 pb-2">
              <ViewportCard
                title="Tile editor"
                hint={`${bounds.sw}×${bounds.sh} crop · drag walk or lip line`}
                checker={transparentPreview}
              >
                <div className="rounded-md p-2" style={transparentPreview ? undefined : CHECKER_BG}>
                  <TileStackEditorCanvas
                    atlas={entry.atlas}
                    bounds={bounds}
                    stack={stack}
                    onChange={applyStack}
                    displayPx={240}
                    knockOutGutter={transparentPreview}
                  />
                </div>
              </ViewportCard>

              <div className="grid gap-3 md:grid-cols-3">
                <ViewportCard
                  title="Outlines"
                  hint="Lime walk · orange lip band"
                  checker={transparentPreview}
                >
                  <div className="rounded-md p-2" style={transparentPreview ? undefined : CHECKER_BG}>
                    <AtlasTileOutlinePreview
                      atlas={entry.atlas}
                      bounds={bounds}
                      stack={stack}
                      displayPx={140}
                      knockOutGutter={transparentPreview}
                    />
                  </div>
                </ViewportCard>

                <ViewportCard
                  title="Stacked cell"
                  hint={`${stack.layout.logicalTilePx}px walk surface`}
                  checker={transparentPreview}
                >
                  <TopDownStackedAtlasTile
                    atlas={entry.atlas}
                    bounds={bounds}
                    stack={stack}
                    knockOutGutter={transparentPreview}
                  />
                </ViewportCard>

                <ViewportCard
                  title="4×4 stacked"
                  hint={`Row ${rowStride}px · col ${colStride}px · lip ${stack.layout.lipOverlapPx}px`}
                  checker={transparentPreview}
                >
                  <AtlasTileStackedGridPreview
                    atlas={entry.atlas}
                    bounds={bounds}
                    stack={stack}
                    knockOutGutter={transparentPreview}
                  />
                </ViewportCard>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col bg-kid-surface-muted/25">
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
              <div className="space-y-1.5 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                  Crop bounds
                </p>
                <SpriteBoundsFieldRow field="sx" label="sx" value={bounds.sx} min={0} max={entry.atlas.width - 1} onChange={(v) => applyBounds({ ...bounds, sx: v })} onBump={(d) => bumpField("sx", d)} />
                <SpriteBoundsFieldRow field="sy" label="sy" value={bounds.sy} min={0} max={entry.atlas.height - 1} onChange={(v) => applyBounds({ ...bounds, sy: v })} onBump={(d) => bumpField("sy", d)} />
                <SpriteBoundsFieldRow field="sw" label="sw" value={bounds.sw} min={1} max={entry.atlas.width - bounds.sx} onChange={(v) => applyBounds({ ...bounds, sw: v })} onBump={(d) => bumpField("sw", d)} />
                <SpriteBoundsFieldRow field="sh" label="sh" value={bounds.sh} min={1} max={entry.atlas.height - bounds.sy} onChange={(v) => applyBounds({ ...bounds, sh: v })} onBump={(d) => bumpField("sh", d)} />
              </div>

              <div className="space-y-1.5 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                  Walk surface
                </p>
                <TileFieldRow label="ix" value={stack.walk.insetX} min={0} max={bounds.sw - 1} onChange={(insetX) => updateWalk({ insetX })} />
                <TileFieldRow label="iy" value={stack.walk.insetY} min={0} max={bounds.sh - 1} onChange={(insetY) => updateWalk({ insetY })} />
                <TileFieldRow label="w" value={stack.walk.width} min={1} max={bounds.sw - stack.walk.insetX} onChange={(width) => updateWalk({ width })} />
                <TileFieldRow label="h" value={stack.walk.height} min={1} max={bounds.sh - stack.walk.insetY} onChange={(height) => updateWalk({ height })} />
              </div>

              {letterFruitEditor ?
                <div className="space-y-1.5 rounded-lg border-2 border-lime-700/30 bg-kid-panel p-2.5">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-kid-cta"
                      checked={has3dLip}
                      onChange={(e) => toggleLetterFruit3dLip(e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                        3D lip
                      </span>
                      <span className="mt-0.5 block text-[0.6rem] font-semibold text-kid-ink/55">
                        Off for all Letter A stages — flat plant art with no row tuck-under.
                      </span>
                    </span>
                  </label>
                </div>
              : null}

              {(!letterFruitEditor || has3dLip) ?
                <div className="space-y-1.5 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
                  <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                    Lip split line
                  </p>
                  <TileFieldRow
                    label="y"
                    value={stack.lipStartY}
                    min={minLipY}
                    max={bounds.sh}
                    onChange={updateLipStartY}
                  />
                  {lip ?
                    <p className="font-mono text-[0.6rem] text-kid-ink/55">
                      Lip band: y {lip.y}–{lip.y + lip.h} ({lip.h}px tucks under row ahead)
                    </p>
                  : null}
                </div>
              : null}

              <div className="space-y-1.5 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                  Stack layout
                </p>
                <TileFieldRow label="cell" value={stack.layout.logicalTilePx} min={16} max={128} onChange={(logicalTilePx) => updateLayout({ logicalTilePx })} />
                {(!letterFruitEditor || has3dLip) ?
                  <TileFieldRow label="lip" value={stack.layout.lipOverlapPx} min={0} max={stack.layout.logicalTilePx - 1} onChange={(lipOverlapPx) => updateLayout({ lipOverlapPx })} />
                : null}
                <TileFieldRow label="col" value={stack.layout.columnOverlapPx} min={0} max={stack.layout.logicalTilePx - 1} onChange={(columnOverlapPx) => updateLayout({ columnOverlapPx })} />
              </div>

              <pre className="max-h-24 overflow-auto rounded-md bg-kid-ink/5 p-2 font-mono text-[0.58rem] leading-relaxed text-kid-ink/80">
                {boundsExportText}
              </pre>
              <p className="text-[0.6rem] font-semibold text-kid-ink/55">
                Bounds → {entry.configPath}
              </p>
              <pre className="max-h-32 overflow-auto rounded-md bg-kid-ink/5 p-2 font-mono text-[0.58rem] leading-relaxed text-kid-ink/80">
                {exportText}
              </pre>
              <p className="text-[0.6rem] font-semibold text-kid-ink/55">
                Stack preset → {stackPresetPath}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t-2 border-kid-ink/15 bg-kid-panel p-3">
              <div className="flex flex-wrap gap-2">
                <KidButton type="button" variant="primary" onClick={copyExport}>
                  Copy full tile
                </KidButton>
                {letterFruitEditor ?
                  <KidButton
                    type="button"
                    variant="secondary"
                    disabled={saveBusy || letterFruitSlug !== "a"}
                    onClick={() => void saveLetterFruitToCode()}
                  >
                    {saveBusy ? "Saving…" : "Save to code"}
                  </KidButton>
                : null}
                <KidButton type="button" variant="secondary" onClick={copyBoundsExport}>
                  Copy bounds
                </KidButton>
                <KidButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetBounds(editorTarget.atlasId, editorTarget.assetId);
                    resetStackPreset(editorTarget.atlasId, editorTarget.assetId);
                    setDraftBounds(defaultBounds);
                    setDraftStack(getDefaultStackPreset(editorTarget.atlasId, editorTarget.assetId, defaultBounds));
                    setSaveStatus(null);
                  }}
                  disabled={!boundsDirty && !stackDirty}
                >
                  Reset
                </KidButton>
                <KidButton type="button" variant="secondary" onClick={closeEditor}>
                  Done
                </KidButton>
              </div>
              {saveStatus ?
                <p
                  className={clsx(
                    "text-xs font-semibold",
                    saveStatus.endsWith("stale.") ? "text-emerald-800" : "text-amber-900",
                  )}
                >
                  {saveStatus}
                </p>
              : null}
            </div>
          </aside>
        </div>
      </KidPanel>
    </div>
  );
}
