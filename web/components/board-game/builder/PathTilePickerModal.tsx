"use client";

import { clsx } from "clsx";
import { useEffect } from "react";
import { PathTileThumbnail } from "@/components/board-game/builder/PathTileThumbnail";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { WKE_PATH_ASSET_GROUPS } from "@/lib/topdown/preview-board-game-path";
import { pathTileLabel } from "@/lib/topdown/wke-path-tile-labels";
import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

type Props = {
  open: boolean;
  selectedId?: WkePathTileId;
  autotileId?: WkePathTileId;
  onSelect: (tileId: WkePathTileId) => void;
  onClose: () => void;
};

export function PathTilePickerModal({
  open,
  selectedId,
  autotileId,
  onSelect,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-kid-ink/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="path-tile-picker-title"
      onClick={onClose}
    >
      <KidPanel
        className="flex max-h-[min(90vh,40rem)] w-full max-w-3xl flex-col overflow-hidden p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-kid-ink/15 px-4 py-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
              Path tile
            </p>
            <h2 id="path-tile-picker-title" className="text-lg font-extrabold text-kid-ink">
              Choose path art
            </h2>
            <p className="text-xs font-semibold text-kid-ink/60">
              Pick a dirt-on-grass tile for this grid cell. Autotile suggestion is highlighted.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border-2 border-kid-ink bg-kid-panel px-3 py-1 text-sm font-bold"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {WKE_PATH_ASSET_GROUPS.map((group) => (
            <section key={group.label} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {group.assetIds.map((assetId) => {
                  const meta = pathTileLabel(assetId);
                  const isSelected = selectedId === assetId;
                  const isAutotile = autotileId === assetId;

                  return (
                    <button
                      key={assetId}
                      type="button"
                      className={clsx(
                        "flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 text-center transition-colors",
                        isSelected ?
                          "border-kid-accent bg-kid-accent/15"
                        : "border-kid-ink/25 bg-kid-surface-muted/40 hover:bg-kid-surface-muted/70",
                        isAutotile && !isSelected && "ring-2 ring-sky-400/60 ring-offset-1",
                      )}
                      title={`${meta.title}\n${meta.subtitle}\n${assetId}`}
                      onClick={() => {
                        onSelect(assetId);
                        onClose();
                      }}
                    >
                      <div className="overflow-hidden rounded-md bg-[#3a3a3a]">
                        <PathTileThumbnail tileId={assetId} sizePx={64} alt={meta.title} />
                      </div>
                      <p className="text-[0.65rem] font-extrabold leading-tight text-kid-ink">
                        {meta.title}
                      </p>
                      <p className="font-mono text-[0.55rem] text-kid-ink/50">{assetId}</p>
                      {isAutotile ?
                        <span className="text-[0.5rem] font-bold uppercase text-sky-700">
                          Autotile
                        </span>
                      : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="shrink-0 border-t-2 border-kid-ink/15 px-4 py-3">
          <KidButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </KidButton>
        </footer>
      </KidPanel>
    </div>
  );
}
