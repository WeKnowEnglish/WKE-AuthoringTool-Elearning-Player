"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useBoundsOverride } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { SpriteBoundsFieldRow } from "@/components/pilots/topdown-sprites/SpriteBoundsFieldRow";
import { SpriteSheetCropCanvas } from "@/components/pilots/topdown-sprites/SpriteSheetCropCanvas";
import { getPreviewAtlasEntry } from "@/lib/topdown/atlas-registry";
import {
  bumpSpriteRectField,
  clampSpriteRect,
  formatAtlasAssetLine,
  rectsEqual,
  type BoundsField,
} from "@/lib/topdown/bounds-editor-utils";
import type { SpriteRect } from "@/lib/topdown/types";

const PREVIEW_PX = 120;

export function SpriteBoundsEditorModal() {
  const {
    editorTarget,
    closeEditor,
    getBounds,
    setBounds,
    resetBounds,
    getDefaultBounds,
  } = useBoundsOverride();

  const entry = editorTarget ? getPreviewAtlasEntry(editorTarget.atlasId) : undefined;
  const defaultBounds = editorTarget
    ? getDefaultBounds(editorTarget.atlasId, editorTarget.assetId)
    : undefined;

  const liveBounds = useMemo(() => {
    if (!editorTarget || !defaultBounds) return null;
    return getBounds(editorTarget.atlasId, editorTarget.assetId, defaultBounds);
  }, [defaultBounds, editorTarget, getBounds]);

  const [draft, setDraft] = useState<SpriteRect | null>(null);
  const bounds = draft ?? liveBounds;

  useEffect(() => {
    if (!editorTarget || !defaultBounds) {
      setDraft(null);
      return;
    }
    setDraft(getBounds(editorTarget.atlasId, editorTarget.assetId, defaultBounds));
  }, [defaultBounds, editorTarget, getBounds]);

  useEffect(() => {
    if (!editorTarget) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeEditor();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeEditor, editorTarget]);

  const applyBounds = useCallback(
    (next: SpriteRect) => {
      if (!editorTarget || !entry) return;
      const clamped = clampSpriteRect(next, entry.atlas.width, entry.atlas.height);
      setDraft(clamped);
      setBounds(editorTarget.atlasId, editorTarget.assetId, clamped);
    },
    [editorTarget, entry, setBounds],
  );

  const bumpField = useCallback(
    (field: BoundsField, delta: number) => {
      if (!bounds || !entry) return;
      applyBounds(bumpSpriteRectField(bounds, field, delta, entry.atlas.width, entry.atlas.height));
    },
    [applyBounds, bounds, entry],
  );

  async function copyLine() {
    if (!editorTarget || !bounds) return;
    const line = formatAtlasAssetLine(editorTarget.assetId, bounds);
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // clipboard may be blocked
    }
  }

  if (!editorTarget || !entry || !defaultBounds || !bounds) return null;

  const isDirty = !rectsEqual(bounds, defaultBounds);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-kid-ink/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sprite-bounds-editor-title"
      onClick={closeEditor}
    >
      <KidPanel
        className="relative flex max-h-[95vh] w-full max-w-5xl flex-col gap-4 overflow-y-auto p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
              Bounds editor
            </p>
            <h2
              id="sprite-bounds-editor-title"
              className="text-lg font-extrabold text-kid-ink sm:text-xl"
            >
              {editorTarget.label}
            </h2>
            <p className="font-mono text-xs font-semibold text-kid-ink/70">
              {editorTarget.assetId} · {entry.configPath}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border-2 border-kid-ink bg-kid-panel px-3 py-1 text-sm font-bold"
            onClick={closeEditor}
            aria-label="Close bounds editor"
          >
            ×
          </button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
          <SpriteSheetCropCanvas atlas={entry.atlas} bounds={bounds} onChange={applyBounds} />

          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">Preview</p>
            <div
              className="flex h-32 w-32 items-center justify-center rounded-lg border-4 border-kid-ink/30"
              style={{
                backgroundImage:
                  "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
              }}
            >
              <TopDownSprite
                atlas={entry.atlas}
                bounds={bounds}
                scale={PREVIEW_PX / bounds.sw}
                alt={editorTarget.label}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border-2 border-kid-ink/15 bg-kid-surface-muted/40 p-3">
          <SpriteBoundsFieldRow
            field="sx"
            label="sx"
            value={bounds.sx}
            min={0}
            max={entry.atlas.width - 1}
            onChange={(value) => applyBounds({ ...bounds, sx: value })}
            onBump={(delta) => bumpField("sx", delta)}
          />
          <SpriteBoundsFieldRow
            field="sy"
            label="sy"
            value={bounds.sy}
            min={0}
            max={entry.atlas.height - 1}
            onChange={(value) => applyBounds({ ...bounds, sy: value })}
            onBump={(delta) => bumpField("sy", delta)}
          />
          <SpriteBoundsFieldRow
            field="sw"
            label="sw"
            value={bounds.sw}
            min={1}
            max={entry.atlas.width - bounds.sx}
            onChange={(value) => applyBounds({ ...bounds, sw: value })}
            onBump={(delta) => bumpField("sw", delta)}
          />
          <SpriteBoundsFieldRow
            field="sh"
            label="sh"
            value={bounds.sh}
            min={1}
            max={entry.atlas.height - bounds.sy}
            onChange={(value) => applyBounds({ ...bounds, sh: value })}
            onBump={(delta) => bumpField("sh", delta)}
          />
        </div>

        <p className="break-all rounded-md bg-kid-ink/5 px-2 py-1.5 font-mono text-xs text-kid-ink/80">
          {formatAtlasAssetLine(editorTarget.assetId, bounds)}
        </p>

        <div className="flex flex-wrap gap-2">
          <KidButton type="button" variant="primary" onClick={copyLine}>
            Copy TS line
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => {
              resetBounds(editorTarget.atlasId, editorTarget.assetId);
              setDraft(defaultBounds);
            }}
            disabled={!isDirty}
          >
            Reset to file
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={closeEditor}>
            Done
          </KidButton>
        </div>
      </KidPanel>
    </div>
  );
}
