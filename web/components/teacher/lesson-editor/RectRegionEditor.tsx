"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
} from "react";

export type RectPercent = {
  id: string;
  x_percent: number;
  y_percent: number;
  w_percent: number;
  h_percent: number;
  label?: string;
};

type Props = {
  imageUrl: string;
  imageFit?: "cover" | "contain";
  stageAspectRatio?: string;
  cropXPercent?: number;
  cropYPercent?: number;
  cropZoomPercent?: number;
  regions: RectPercent[];
  onRegionsChange: (next: RectPercent[]) => void;
  selectedId: string | null;
  selectedIds?: string[];
  onSelect: (id: string | null) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  /** When false, overlays are non-interactive (e.g. while saving) */
  disabled?: boolean;
  /** Optional content inside each region (e.g. story item image) */
  renderRegion?: (r: RectPercent) => ReactNode;
  /** Optional extra width-only resize handle (right-middle) */
  showHorizontalResizeHandle?: (r: RectPercent) => boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function RectRegionEditor({
  imageUrl,
  imageFit = "cover",
  stageAspectRatio = "16 / 10",
  cropXPercent = 0,
  cropYPercent = 0,
  cropZoomPercent = 100,
  regions,
  onRegionsChange,
  selectedId,
  selectedIds,
  onSelect,
  onSelectedIdsChange,
  disabled,
  renderRegion,
  showHorizontalResizeHandle,
}: Props) {
  const selectedSet = new Set(
    selectedIds && selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [],
  );

  const applySelection = useCallback(
    (id: string | null, opts?: { append?: boolean }) => {
      if (id == null) {
        onSelect(null);
        onSelectedIdsChange?.([]);
        return;
      }
      if (opts?.append) {
        const current = selectedIds && selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        const exists = current.includes(id);
        const next = exists ? current.filter((x) => x !== id) : [...current, id];
        onSelect(next[0] ?? null);
        onSelectedIdsChange?.(next);
        return;
      }
      onSelect(id);
      onSelectedIdsChange?.([id]);
    },
    [onSelect, onSelectedIdsChange, selectedId, selectedIds],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const regionsRef = useRef(regions);
  const onRegionsChangeRef = useRef(onRegionsChange);
  const dragRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const resizeRef = useRef<{
    id: string;
    startLeftPx: number;
    startTopPx: number;
    aspectPx: number;
    mode: "proportional" | "horizontal";
    startWpx: number;
    startClientX: number;
  } | null>(null);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    onRegionsChangeRef.current = onRegionsChange;
  }, [onRegionsChange]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const resize = resizeRef.current;
    if (resize) {
      const currentRegions = regionsRef.current;
      const item = currentRegions.find((r) => r.id === resize.id);
      if (!item) return;

      const leftPx = resize.startLeftPx;
      const topPx = resize.startTopPx;
      const relX = e.clientX - rect.left;

      const minWpx = Math.max(8, rect.width * 0.02);
      const minHpx = Math.max(8, rect.height * 0.02);
      const maxW = rect.width - leftPx;
      const maxH = rect.height - topPx;

      if (resize.mode === "horizontal") {
        const dx = e.clientX - resize.startClientX;
        const newWpx = clamp(resize.startWpx + dx, minWpx, maxW);
        const nw = (newWpx / rect.width) * 100;
        onRegionsChangeRef.current(
          currentRegions.map((r) =>
            r.id === resize.id ? { ...r, w_percent: nw } : r,
          ),
        );
        return;
      }

      let newWpx = relX - leftPx;
      let newHpx = newWpx / resize.aspectPx;

      newWpx = clamp(newWpx, minWpx, maxW);
      newHpx = newWpx / resize.aspectPx;

      if (newHpx > maxH) {
        newHpx = maxH;
        newWpx = newHpx * resize.aspectPx;
      }
      if (newWpx > maxW) {
        newWpx = maxW;
        newHpx = newWpx / resize.aspectPx;
      }

      if (newWpx < minWpx) {
        newWpx = minWpx;
        newHpx = newWpx / resize.aspectPx;
      }
      if (newHpx < minHpx) {
        newHpx = minHpx;
        newWpx = newHpx * resize.aspectPx;
        if (newWpx > maxW) {
          newWpx = maxW;
          newHpx = newWpx / resize.aspectPx;
        }
      }

      const nw = (newWpx / rect.width) * 100;
      const nh = (newHpx / rect.height) * 100;

      onRegionsChangeRef.current(
        currentRegions.map((r) =>
          r.id === resize.id ? { ...r, w_percent: nw, h_percent: nh } : r,
        ),
      );
      return;
    }

    const d = dragRef.current;
    if (!d) return;

    const dx = ((e.clientX - d.startClientX) / rect.width) * 100;
    const dy = ((e.clientY - d.startClientY) / rect.height) * 100;
    const currentRegions = regionsRef.current;
    const item = currentRegions.find((r) => r.id === d.id);
    if (!item) return;
    const nx = clamp(d.startX + dx, 0, 100 - item.w_percent);
    const ny = clamp(d.startY + dy, 0, 100 - item.h_percent);
    onRegionsChangeRef.current(
      currentRegions.map((r) =>
        r.id === d.id ? { ...r, x_percent: nx, y_percent: ny } : r,
      ),
    );
  }, []);

  function endInteraction() {
    dragRef.current = null;
    resizeRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endInteraction);
    window.removeEventListener("pointercancel", endInteraction);
  }

  const startDrag = (id: string, e: React.PointerEvent) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    applySelection(id, { append: e.ctrlKey || e.metaKey });
    const item = regionsRef.current.find((r) => r.id === id);
    if (!item) return;
    dragRef.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: item.x_percent,
      startY: item.y_percent,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const startResize = (
    id: string,
    e: React.PointerEvent,
    mode: "proportional" | "horizontal",
  ) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    applySelection(id, { append: e.ctrlKey || e.metaKey });
    const wrap = wrapRef.current;
    const item = regionsRef.current.find((r) => r.id === id);
    if (!wrap || !item) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const leftPx = (item.x_percent / 100) * rect.width;
    const topPx = (item.y_percent / 100) * rect.height;
    const wPx = (item.w_percent / 100) * rect.width;
    const hPx = (item.h_percent / 100) * rect.height;
    const aspectPx = wPx / Math.max(hPx, 0.0001);

    resizeRef.current = {
      id,
      startLeftPx: leftPx,
      startTopPx: topPx,
      aspectPx,
      mode,
      startWpx: wPx,
      startClientX: e.clientX,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  useEffect(() => () => endInteraction(), [onPointerMove]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded border border-neutral-300 bg-neutral-100"
      style={{ aspectRatio: stageAspectRatio }}
      onClick={(e) => {
        if (disabled) return;
        const target = e.target as HTMLElement | null;
        if (!target?.closest("[data-region-editor-item='true']")) {
          applySelection(null);
        }
      }}
    >
      <Image
        src={imageUrl}
        alt=""
        fill
        className={imageFit === "contain" ? "object-contain" : "object-cover"}
        style={{
          transform: `translate(${cropXPercent}%, ${cropYPercent}%) scale(${Math.max(0.5, cropZoomPercent / 100)})`,
          transformOrigin: "center center",
        }}
        unoptimized={imageUrl.includes("placehold.co") || imageUrl.includes("supabase.co")}
      />
      {regions.map((r) => {
        const sel = selectedSet.has(r.id);
        const hasHorizontalResizeHandle = showHorizontalResizeHandle?.(r) ?? false;
        return (
          <div
            key={r.id}
            data-region-editor-item="true"
            className={clsx(
              "group absolute touch-none select-none",
              sel ? "z-20" : "z-10",
            )}
            style={{
              left: `${r.x_percent}%`,
              top: `${r.y_percent}%`,
              width: `${r.w_percent}%`,
              height: `${r.h_percent}%`,
            }}
          >
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              className={clsx(
                "absolute inset-0 outline-none",
                !disabled && "cursor-grab active:cursor-grabbing",
                !sel &&
                  "transition-shadow ring-0 ring-transparent group-hover:ring-2 group-hover:ring-white/50",
                sel && "ring-2 ring-sky-500/90",
                disabled && "pointer-events-none opacity-60",
              )}
              onPointerDown={(e) => startDrag(r.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                applySelection(r.id, { append: e.ctrlKey || e.metaKey });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  applySelection(r.id);
                }
              }}
            >
              {renderRegion ? (
                <span className="pointer-events-none absolute inset-0 overflow-hidden">
                  {renderRegion(r)}
                </span>
              ) : (
                <span className="pointer-events-none flex h-full w-full items-end justify-start p-0.5">
                  <span className="max-w-full truncate rounded bg-black/50 px-1 text-[10px] font-semibold text-white">
                    {r.label || r.id}
                  </span>
                </span>
              )}
            </div>

            {sel && !disabled ? (
              <>
                <button
                  type="button"
                  aria-label="Resize region (keeps proportions)"
                  className="pointer-events-auto absolute -bottom-1.5 -right-1.5 z-30 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-sky-600 bg-white shadow-md touch-manipulation"
                  title="Resize layout box (keeps proportions)"
                  onPointerDown={(e) => startResize(r.id, e, "proportional")}
                />
                {hasHorizontalResizeHandle ? (
                  <button
                    type="button"
                    aria-label="Resize text box width"
                    className="pointer-events-auto absolute -right-1.5 top-1/2 z-30 h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-sm border-2 border-sky-600 bg-white shadow-md touch-manipulation"
                    title="Resize width"
                    onPointerDown={(e) => startResize(r.id, e, "horizontal")}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function nextRegionId(existing: RectPercent[], prefix: string): string {
  let n = existing.length + 1;
  let id = `${prefix}${n}`;
  const ids = new Set(existing.map((r) => r.id));
  while (ids.has(id)) {
    n += 1;
    id = `${prefix}${n}`;
  }
  return id;
}

export function defaultRegion(id: string): RectPercent {
  return {
    id,
    x_percent: 10,
    y_percent: 10,
    w_percent: 18,
    h_percent: 14,
  };
}
