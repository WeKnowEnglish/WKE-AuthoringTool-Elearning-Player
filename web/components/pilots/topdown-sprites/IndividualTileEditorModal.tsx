"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useIndividualTileEditor } from "@/components/pilots/topdown-sprites/IndividualTileEditorContext";
import {
  TopDownIndividualTile,
  TopDownStackedIndividualTile,
} from "@/components/topdown/TopDownIndividualTile";
import {
  presetExportName,
  type IndividualTileDef,
} from "@/lib/topdown/individual-tiles";
import {
  clampTileRect,
  columnStridePx,
  formatTilePresetTs,
  rowStridePx,
  type TileLayoutPreset,
  type TileRect,
} from "@/lib/topdown/stacked-individual-layout";

const DEMO_GRID = 4;
const NATURAL_PREVIEW_PX = 240;
const STORAGE_KEY = "individual-tile-drafts";

const CHECKER_BG = {
  backgroundImage:
    "linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
} as const;

type TileDraft = {
  content: TileRect;
  footprint: TileRect;
  layout: TileLayoutPreset;
};

type DraftMap = Record<string, TileDraft>;

function normalizeDraft(draft: TileDraft): TileDraft {
  return {
    content: { ...draft.content },
    footprint: { ...draft.footprint },
    layout: {
      logicalTilePx: draft.layout.logicalTilePx,
      lipOverlapPx: draft.layout.lipOverlapPx,
      columnOverlapPx: draft.layout.columnOverlapPx,
    },
  };
}

function draftFromTile(tile: IndividualTileDef): TileDraft {
  return normalizeDraft({
    content: { ...tile.content },
    footprint: { ...tile.footprint },
    layout: { ...tile.layout },
  });
}

function readStoredDrafts(): DraftMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredDrafts(drafts: DraftMap) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore quota errors
  }
}

type FieldRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

function FieldRow({ label, value, min, max, onChange }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr_2.5rem] items-center gap-1.5">
      <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-0.5">
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => onChange(value - 10)}
          aria-label={`Decrease ${label} by 10`}
        >
          ⏪
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label} by 1`}
        >
          ◀
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 accent-kid-cta"
          aria-label={`${label} slider`}
        />
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label} by 1`}
        >
          ▶
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-xs font-bold"
          onClick={() => onChange(value + 10)}
          aria-label={`Increase ${label} by 10`}
        >
          ⏩
        </button>
      </div>
      <span className="text-right font-mono text-xs font-bold tabular-nums text-kid-ink">
        {value}
      </span>
    </div>
  );
}

function ViewportCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border-2 border-kid-ink/20 bg-kid-surface-muted/30 p-3">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
          {title}
        </p>
        {hint ?
          <p className="text-[0.65rem] font-semibold text-kid-ink/55">{hint}</p>
        : null}
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto rounded-md bg-[#3a3a3a] p-3">
        {children}
      </div>
    </div>
  );
}

function TileEditorBody({
  tile,
  onClose,
}: {
  tile: IndividualTileDef;
  onClose: () => void;
}) {
  const fileDraft = useMemo(() => draftFromTile(tile), [tile]);
  const [draft, setDraft] = useState<TileDraft>(() => {
    const stored = readStoredDrafts()[tile.id];
    return stored ? normalizeDraft(stored) : fileDraft;
  });
  const [copyLabel, setCopyLabel] = useState("Copy preset");

  useEffect(() => {
    const stored = readStoredDrafts()[tile.id];
    setDraft(stored ? normalizeDraft(stored) : draftFromTile(tile));
  }, [tile]);

  useEffect(() => {
    const stored = readStoredDrafts();
    writeStoredDrafts({ ...stored, [tile.id]: draft });
  }, [draft, tile.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const updateFootprint = useCallback(
    (patch: Partial<TileRect>) => {
      setDraft((prev) => ({
        ...prev,
        footprint: clampTileRect(
          { ...prev.footprint, ...patch },
          tile.width,
          tile.height,
        ),
      }));
    },
    [tile.height, tile.width],
  );

  const updateContent = useCallback(
    (patch: Partial<TileRect>) => {
      setDraft((prev) => ({
        ...prev,
        content: clampTileRect(
          { ...prev.content, ...patch },
          tile.width,
          tile.height,
        ),
      }));
    },
    [tile.height, tile.width],
  );

  const updateLayout = useCallback((patch: Partial<TileLayoutPreset>) => {
    setDraft((prev) => {
      const logicalTilePx = Math.max(
        8,
        patch.logicalTilePx ?? prev.layout.logicalTilePx,
      );
      return {
        ...prev,
        layout: {
          logicalTilePx,
          lipOverlapPx: Math.max(
            0,
            Math.min(
              logicalTilePx - 1,
              patch.lipOverlapPx ?? prev.layout.lipOverlapPx,
            ),
          ),
          columnOverlapPx: Math.max(
            0,
            Math.min(
              logicalTilePx - 1,
              patch.columnOverlapPx ?? prev.layout.columnOverlapPx,
            ),
          ),
        },
      };
    });
  }, []);

  const rowStride = rowStridePx(draft.layout);
  const colStride = columnStridePx(draft.layout);

  const presetText = formatTilePresetTs({
    exportName: presetExportName(tile.id),
    id: tile.id,
    label: tile.label,
    category: tile.category,
    imageSrc: tile.imageSrc,
    width: tile.width,
    height: tile.height,
    content: draft.content,
    footprint: draft.footprint,
    layout: draft.layout,
  });

  async function copyPreset() {
    try {
      await navigator.clipboard.writeText(presetText);
      setCopyLabel("Copied!");
      window.setTimeout(() => setCopyLabel("Copy preset"), 1500);
    } catch {
      setCopyLabel("Copy failed");
      window.setTimeout(() => setCopyLabel("Copy preset"), 1500);
    }
  }

  return (
    <KidPanel
      className="relative flex h-[min(92vh,52rem)] w-full max-w-6xl flex-col overflow-hidden p-0"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-kid-ink/15 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
            Individual tile editor
          </p>
          <h2
            id="individual-tile-editor-title"
            className="text-lg font-extrabold text-kid-ink sm:text-xl"
          >
            {tile.label}
          </h2>
          <p className="truncate font-mono text-xs font-semibold text-kid-ink/70">
            {tile.imageSrc} · {tile.width}×{tile.height}px · {tile.id}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border-2 border-kid-ink bg-kid-panel px-3 py-1 text-sm font-bold"
          onClick={onClose}
          aria-label="Close tile editor"
        >
          ×
        </button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Viewports */}
        <div className="min-h-0 overflow-y-auto border-b-2 border-kid-ink/15 p-4 lg:border-b-0 lg:border-r-2 lg:border-kid-ink/15">
          <p className="mb-3 text-xs font-semibold text-kid-ink/60">
            Magenta = content · Lime = footprint (walk surface)
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
            <ViewportCard
              title="Natural + outlines"
              hint="Full PNG with content / footprint boxes"
            >
              <div style={CHECKER_BG} className="rounded-md p-2">
                <TopDownIndividualTile
                  tile={tile}
                  displayWidthPx={NATURAL_PREVIEW_PX}
                  alt={tile.label}
                  content={draft.content}
                  footprint={draft.footprint}
                  showOutlines
                />
              </div>
            </ViewportCard>

            <ViewportCard
              title="Map cell"
              hint={`${draft.layout.logicalTilePx}px footprint`}
            >
                <TopDownStackedIndividualTile
                  tile={tile}
                  footprint={draft.footprint}
                  layout={draft.layout}
                />
              </ViewportCard>
            </div>

            <ViewportCard
              title={`${DEMO_GRID}×${DEMO_GRID} stacked map`}
              hint={`Row stride ${rowStride}px · column stride ${colStride}px`}
            >
              <div
                className="w-fit overflow-visible"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${DEMO_GRID}, ${colStride}px)`,
                  gridAutoRows: `${rowStride}px`,
                  gap: 0,
                }}
              >
                {Array.from({ length: DEMO_GRID * DEMO_GRID }, (_, i) => (
                  <div key={i} style={{ zIndex: Math.floor(i / DEMO_GRID) }}>
                    <TopDownStackedIndividualTile
                      tile={tile}
                      footprint={draft.footprint}
                      layout={draft.layout}
                    />
                  </div>
                ))}
              </div>
            </ViewportCard>
          </div>
        </div>

        {/* Side panel controls */}
        <aside className="flex min-h-0 flex-col bg-kid-surface-muted/25">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
            <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                Footprint (walk surface)
              </p>
              <FieldRow
                label="fx"
                value={draft.footprint.x}
                min={0}
                max={tile.width - 1}
                onChange={(x) => updateFootprint({ x })}
              />
              <FieldRow
                label="fy"
                value={draft.footprint.y}
                min={0}
                max={tile.height - 1}
                onChange={(y) => updateFootprint({ y })}
              />
              <FieldRow
                label="fw"
                value={draft.footprint.w}
                min={1}
                max={tile.width - draft.footprint.x}
                onChange={(w) => updateFootprint({ w })}
              />
              <FieldRow
                label="fh"
                value={draft.footprint.h}
                min={1}
                max={tile.height - draft.footprint.y}
                onChange={(h) => updateFootprint({ h })}
              />
            </div>

            <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                Content (opaque art)
              </p>
              <FieldRow
                label="cx"
                value={draft.content.x}
                min={0}
                max={tile.width - 1}
                onChange={(x) => updateContent({ x })}
              />
              <FieldRow
                label="cy"
                value={draft.content.y}
                min={0}
                max={tile.height - 1}
                onChange={(y) => updateContent({ y })}
              />
              <FieldRow
                label="cw"
                value={draft.content.w}
                min={1}
                max={tile.width - draft.content.x}
                onChange={(w) => updateContent({ w })}
              />
              <FieldRow
                label="ch"
                value={draft.content.h}
                min={1}
                max={tile.height - draft.content.y}
                onChange={(h) => updateContent({ h })}
              />
            </div>

            <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-panel p-2.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-kid-ink/70">
                Layout
              </p>
              <FieldRow
                label="lip"
                value={draft.layout.lipOverlapPx}
                min={0}
                max={draft.layout.logicalTilePx - 1}
                onChange={(lipOverlapPx) => updateLayout({ lipOverlapPx })}
              />
              <FieldRow
                label="col"
                value={draft.layout.columnOverlapPx}
                min={0}
                max={draft.layout.logicalTilePx - 1}
                onChange={(columnOverlapPx) => updateLayout({ columnOverlapPx })}
              />
              <p className="font-mono text-[0.65rem] text-kid-ink/60">
                row stride {rowStride}px · column stride {colStride}px
              </p>
            </div>

            <pre className="max-h-36 overflow-auto rounded-md bg-kid-ink/5 p-2 font-mono text-[0.6rem] leading-relaxed text-kid-ink/80">
              {presetText}
            </pre>
            <p className="text-[0.65rem] font-semibold text-kid-ink/55">
              Paste into{" "}
              <code className="rounded bg-kid-ink/10 px-1">
                lib/topdown/tile-presets/{tile.id}.ts
              </code>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t-2 border-kid-ink/15 bg-kid-panel p-3">
            <KidButton type="button" variant="primary" onClick={copyPreset}>
              {copyLabel}
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              onClick={() => setDraft(fileDraft)}
            >
              Reset to file
            </KidButton>
            <KidButton type="button" variant="secondary" onClick={onClose}>
              Done
            </KidButton>
          </div>
        </aside>
      </div>
    </KidPanel>
  );
}

export function IndividualTileEditorModal() {
  const { editingTile, closeEditor } = useIndividualTileEditor();

  if (!editingTile) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-kid-ink/60 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="individual-tile-editor-title"
      onClick={closeEditor}
    >
      <TileEditorBody tile={editingTile} onClose={closeEditor} />
    </div>
  );
}
