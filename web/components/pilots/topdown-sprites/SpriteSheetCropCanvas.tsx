"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { useSpriteSheetPixelData } from "@/components/pilots/topdown-sprites/useSpriteSheetPixelData";
import {
  clampSpriteRect,
  clientPointToSheet,
  rectsEqual,
} from "@/lib/topdown/bounds-editor-utils";
import {
  detectBoundsForAtlas,
  edgeDetectOptionsForAtlas,
  snapBoundsFromClickForAtlas,
  atlasUsesWkeGridSnap,
} from "@/lib/topdown/atlas-bounds-snap";
import { detectBestSpriteBoundsAtPoint } from "@/lib/topdown/sprite-edge-detection";
import type { PreviewAtlasId } from "@/lib/topdown/atlas-registry";
import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

type Handle =
  | "move"
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "draw";

export type SpriteBoundsChangeMeta = {
  source: "detect" | "manual";
};

type Props = {
  atlas: SpriteAtlasConfig;
  bounds: SpriteRect;
  onChange: (next: SpriteRect, meta?: SpriteBoundsChangeMeta) => void;
  onDetectStatus?: (message: string | null) => void;
  focusKey?: string;
  atlasId?: PreviewAtlasId | string;
  canonicalBounds?: SpriteRect;
  /** Re-run edge detect when focusKey changes and pixel data is ready (default true). */
  autoDetectOnFocus?: boolean;
  /** Minimum height of the scrollable sheet viewport in px (default 280). */
  viewportMinHeight?: number;
};

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2.5;
const INITIAL_TILE_ZOOM_CAP = 2;

function hitHandle(
  x: number,
  y: number,
  rect: SpriteRect,
  handleSize = 10,
): Handle | null {
  const within = (px: number, py: number) =>
    x >= px - handleSize &&
    x <= px + handleSize &&
    y >= py - handleSize &&
    y <= py + handleSize;

  const left = rect.sx;
  const right = rect.sx + rect.sw;
  const top = rect.sy;
  const bottom = rect.sy + rect.sh;
  const midX = rect.sx + rect.sw / 2;
  const midY = rect.sy + rect.sh / 2;

  if (within(left, top)) return "nw";
  if (within(midX, top)) return "n";
  if (within(right, top)) return "ne";
  if (within(right, midY)) return "e";
  if (within(right, bottom)) return "se";
  if (within(midX, bottom)) return "s";
  if (within(left, bottom)) return "sw";
  if (within(left, midY)) return "w";
  if (x >= left && x <= right && y >= top && y <= bottom) return "move";
  return null;
}

function resizeRect(
  start: SpriteRect,
  handle: Exclude<Handle, "draw" | "move">,
  pointer: { x: number; y: number },
  sheetWidth: number,
  sheetHeight: number,
): SpriteRect {
  let sx = start.sx;
  let sy = start.sy;
  let sw = start.sw;
  let sh = start.sh;

  const right = start.sx + start.sw;
  const bottom = start.sy + start.sh;

  switch (handle) {
    case "e":
      sw = Math.max(1, pointer.x - start.sx);
      break;
    case "s":
      sh = Math.max(1, pointer.y - start.sy);
      break;
    case "se":
      sw = Math.max(1, pointer.x - start.sx);
      sh = Math.max(1, pointer.y - start.sy);
      break;
    case "w":
      sx = Math.min(pointer.x, right - 1);
      sw = right - sx;
      break;
    case "n":
      sy = Math.min(pointer.y, bottom - 1);
      sh = bottom - sy;
      break;
    case "nw":
      sx = Math.min(pointer.x, right - 1);
      sy = Math.min(pointer.y, bottom - 1);
      sw = right - sx;
      sh = bottom - sy;
      break;
    case "ne":
      sy = Math.min(pointer.y, bottom - 1);
      sw = Math.max(1, pointer.x - start.sx);
      sh = bottom - sy;
      break;
    case "sw":
      sx = Math.min(pointer.x, right - 1);
      sw = right - sx;
      sh = Math.max(1, pointer.y - start.sy);
      break;
    default:
      break;
  }

  return clampSpriteRect({ sx, sy, sw, sh }, sheetWidth, sheetHeight);
}

function zoomToFit(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding = 32,
): number {
  const scaleX = (viewportWidth - padding) / contentWidth;
  const scaleY = (viewportHeight - padding) / contentHeight;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY)));
}

function SelectionDimOverlay({
  bounds,
  scale,
  sheetDisplayWidth,
  sheetDisplayHeight,
}: {
  bounds: SpriteRect;
  scale: number;
  sheetDisplayWidth: number;
  sheetDisplayHeight: number;
}) {
  const left = bounds.sx * scale;
  const top = bounds.sy * scale;
  const width = bounds.sw * scale;
  const height = bounds.sh * scale;

  return (
    <>
      {top > 0 ?
        <div
          className="pointer-events-none absolute left-0 top-0 bg-black/55"
          style={{ width: sheetDisplayWidth, height: top }}
        />
      : null}
      {top + height < sheetDisplayHeight ?
        <div
          className="pointer-events-none absolute left-0 bg-black/55"
          style={{
            top: top + height,
            width: sheetDisplayWidth,
            height: sheetDisplayHeight - top - height,
          }}
        />
      : null}
      {left > 0 ?
        <div
          className="pointer-events-none absolute bg-black/55"
          style={{ left: 0, top, width: left, height }}
        />
      : null}
      {left + width < sheetDisplayWidth ?
        <div
          className="pointer-events-none absolute bg-black/55"
          style={{
            left: left + width,
            top,
            width: sheetDisplayWidth - left - width,
            height,
          }}
        />
      : null}
      <div
        className="pointer-events-none absolute border-2 border-sky-300"
        style={{ left, top, width, height }}
      >
        {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => (
          <span
            key={handle}
            className={clsx(
              "absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-kid-ink bg-white shadow-sm",
              handle === "nw" && "left-0 top-0",
              handle === "n" && "left-1/2 top-0",
              handle === "ne" && "left-full top-0",
              handle === "e" && "left-full top-1/2",
              handle === "se" && "left-full top-full",
              handle === "s" && "left-1/2 top-full",
              handle === "sw" && "left-0 top-full",
              handle === "w" && "left-0 top-1/2",
            )}
          />
        ))}
      </div>
    </>
  );
}

export function SpriteSheetCropCanvas({
  atlas,
  bounds,
  onChange,
  onDetectStatus,
  focusKey,
  atlasId,
  canonicalBounds,
  autoDetectOnFocus = true,
  viewportMinHeight = 280,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const { pixelData, loading: pixelLoading, error: pixelError } = useSpriteSheetPixelData(atlas);
  const [zoom, setZoom] = useState(0.5);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const dragRef = useRef<{
    mode: Handle | "pan";
    startBounds: SpriteRect;
    startPointer: { x: number; y: number };
    moveOffset?: { x: number; y: number };
    drawAnchor?: { x: number; y: number };
    scrollOrigin?: { left: number; top: number };
    pointerOrigin?: { x: number; y: number };
  } | null>(null);

  const displayWidth = Math.round(atlas.width * zoom);
  const displayHeight = Math.round(atlas.height * zoom);
  const scale = displayWidth / atlas.width;

  const toSheetPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = imageWrapRef.current;
      if (!el) return { x: 0, y: 0 };
      return clientPointToSheet(clientX, clientY, el.getBoundingClientRect(), atlas.width);
    },
    [atlas.width],
  );

  /** Prefer file-default tile center so Re-detect works even when the crop is misaligned. */
  const defaultDetectPoint = useCallback(() => {
    if (canonicalBounds) {
      return {
        x: canonicalBounds.sx + Math.floor(canonicalBounds.sw / 2),
        y: canonicalBounds.sy + Math.floor(canonicalBounds.sh / 2),
      };
    }
    return {
      x: bounds.sx + Math.floor(bounds.sw / 2),
      y: bounds.sy + Math.floor(bounds.sh / 2),
    };
  }, [bounds, canonicalBounds]);

  const scrollSelectionIntoView = useCallback(
    (rect: SpriteRect, nextZoom = zoom) => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const scaleFactor = nextZoom;
      const centerX = (rect.sx + rect.sw / 2) * scaleFactor;
      const centerY = (rect.sy + rect.sh / 2) * scaleFactor;
      scroller.scrollTo({
        left: Math.max(0, centerX - scroller.clientWidth / 2),
        top: Math.max(0, centerY - scroller.clientHeight / 2),
        behavior: "smooth",
      });
    },
    [zoom],
  );

  const fitSelection = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const raw = zoomToFit(scroller.clientWidth, scroller.clientHeight, bounds.sw, bounds.sh, 48);
    const nextZoom = Math.min(raw, INITIAL_TILE_ZOOM_CAP);
    setZoom(nextZoom);
    window.requestAnimationFrame(() => scrollSelectionIntoView(bounds, nextZoom));
  }, [bounds, scrollSelectionIntoView]);

  const fitSheet = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const nextZoom = zoomToFit(scroller.clientWidth, scroller.clientHeight, atlas.width, atlas.height, 48);
    setZoom(nextZoom);
    scroller.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }, [atlas.height, atlas.width]);

  useEffect(() => {
    if (!focusKey || autoDetectOnFocus) return;
    window.requestAnimationFrame(() => fitSelection());
  }, [autoDetectOnFocus, focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.mode === "pan" && drag.scrollOrigin && drag.pointerOrigin && scrollRef.current) {
        const scroller = scrollRef.current;
        scroller.scrollLeft = drag.scrollOrigin.left - (e.clientX - drag.pointerOrigin.x);
        scroller.scrollTop = drag.scrollOrigin.top - (e.clientY - drag.pointerOrigin.y);
        return;
      }

      const point = toSheetPoint(e.clientX, e.clientY);

      if (drag.mode === "draw" && drag.drawAnchor) {
        const ax = drag.drawAnchor.x;
        const ay = drag.drawAnchor.y;
        onChange(
          clampSpriteRect(
            {
              sx: Math.min(ax, point.x),
              sy: Math.min(ay, point.y),
              sw: Math.max(1, Math.abs(point.x - ax)),
              sh: Math.max(1, Math.abs(point.y - ay)),
            },
            atlas.width,
            atlas.height,
          ),
        );
        return;
      }

      if (drag.mode === "move" && drag.moveOffset) {
        onChange(
          clampSpriteRect(
            {
              ...drag.startBounds,
              sx: point.x - drag.moveOffset.x,
              sy: point.y - drag.moveOffset.y,
            },
            atlas.width,
            atlas.height,
          ),
        );
        return;
      }

      if (drag.mode !== "draw" && drag.mode !== "move" && drag.mode !== "pan") {
        onChange(
          resizeRect(drag.startBounds, drag.mode, point, atlas.width, atlas.height),
        );
      }
    }

    function onPointerUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [atlas.height, atlas.width, onChange, toSheetPoint]);

  const runAutoDetect = useCallback(
    (point: { x: number; y: number }) => {
      if (!pixelData) {
        onDetectStatus?.("Loading sheet pixels…");
        return false;
      }
      const detectOptions = atlasId ? edgeDetectOptionsForAtlas(atlasId) : undefined;
      const detected = atlasId
        ? detectBoundsForAtlas(
            atlasId,
            pixelData.data,
            pixelData.width,
            pixelData.height,
            point.x,
            point.y,
          )
        : detectBestSpriteBoundsAtPoint(
            pixelData.data,
            pixelData.width,
            pixelData.height,
            point.x,
            point.y,
          );

      let clamped: SpriteRect | null = detected
        ? clampSpriteRect(detected, atlas.width, atlas.height)
        : null;
      let detectSource: "gutter-lines" | "grid-fallback" | "flood-fill" =
        detectOptions?.floodFillOnly ? "flood-fill" : "gutter-lines";

      if (!clamped && atlasId && atlasUsesWkeGridSnap(atlasId)) {
        clamped = snapBoundsFromClickForAtlas(atlasId, point, atlas.width, atlas.height);
        detectSource = "grid-fallback";
      } else if (!clamped && atlasId) {
        clamped = snapBoundsFromClickForAtlas(atlasId, point, atlas.width, atlas.height);
        if (clamped) detectSource = "grid-fallback";
      }

      if (!clamped) {
        onDetectStatus?.("No sprite found — click on the art (not the gutter).");
        return false;
      }

      const statusPrefix =
        detectSource === "flood-fill" ? "Detected from click"
        : detectSource === "gutter-lines" ? "Detected from gutter lines"
        : "Grid fallback";
      if (rectsEqual(clamped, bounds)) {
        onDetectStatus?.(`${statusPrefix}: ${clamped.sw}×${clamped.sh} at (${clamped.sx}, ${clamped.sy})`);
        scrollSelectionIntoView(clamped);
        return true;
      }
      onChange(clamped, { source: "detect" });
      onDetectStatus?.(`${statusPrefix}: ${clamped.sw}×${clamped.sh} at (${clamped.sx}, ${clamped.sy})`);
      scrollSelectionIntoView(clamped);
      return true;
    },
    [atlas.height, atlas.width, atlasId, bounds, onChange, onDetectStatus, pixelData, scrollSelectionIntoView],
  );

  useEffect(() => {
    if (!autoDetectOnFocus || !focusKey || !pixelData) return;
    const point = defaultDetectPoint();
    const frame = window.requestAnimationFrame(() => {
      runAutoDetect(point);
      fitSelection();
    });
    return () => window.cancelAnimationFrame(frame);
    // Detect once per asset focus when pixels become available — not on every bounds tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetectOnFocus, focusKey, pixelData]);

  function onCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button === 1 || spaceHeld || e.altKey) {
      const scroller = scrollRef.current;
      dragRef.current = {
        mode: "pan",
        startBounds: bounds,
        startPointer: toSheetPoint(e.clientX, e.clientY),
        scrollOrigin: scroller ? { left: scroller.scrollLeft, top: scroller.scrollTop } : { left: 0, top: 0 },
        pointerOrigin: { x: e.clientX, y: e.clientY },
      };
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;
    const point = toSheetPoint(e.clientX, e.clientY);
    const handle = hitHandle(point.x, point.y, bounds);

    if (handle === "move") {
      dragRef.current = {
        mode: "move",
        startBounds: bounds,
        startPointer: point,
        moveOffset: { x: point.x - bounds.sx, y: point.y - bounds.sy },
      };
      return;
    }

    if (handle) {
      dragRef.current = {
        mode: handle,
        startBounds: bounds,
        startPointer: point,
      };
      return;
    }

    if (e.shiftKey) {
      dragRef.current = {
        mode: "draw",
        startBounds: bounds,
        startPointer: point,
        drawAnchor: point,
      };
      onChange(
        clampSpriteRect({ sx: point.x, sy: point.y, sw: 1, sh: 1 }, atlas.width, atlas.height),
      );
      return;
    }

    runAutoDetect(point);
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((z + delta).toFixed(2)))));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-kid-ink/70">
          Click sprite art to detect bounds · Shift+drag manual · Space+drag pan · Ctrl+wheel zoom
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarButton onClick={fitSelection}>Fit tile</ToolbarButton>
          <ToolbarButton onClick={fitSheet}>Fit sheet</ToolbarButton>
          <ToolbarButton onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.1).toFixed(2))))}>
            −
          </ToolbarButton>
          <span className="w-12 text-center font-mono text-xs font-bold">{Math.round(zoom * 100)}%</span>
          <ToolbarButton onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.1).toFixed(2))))}>
            +
          </ToolbarButton>
          <ToolbarButton
            onClick={() => runAutoDetect(defaultDetectPoint())}
            disabled={pixelLoading}
          >
            Re-detect
          </ToolbarButton>
        </div>
      </div>

      {pixelError ?
        <p className="shrink-0 text-xs font-semibold text-amber-700">{pixelError}</p>
      : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto rounded-lg border-4 border-kid-ink/30 bg-[#1a1a1a] p-2"
        style={{ minHeight: viewportMinHeight }}
        onWheel={onWheel}
      >
        <div
          ref={imageWrapRef}
          className={clsx(
            "relative shrink-0 select-none overflow-hidden",
            spaceHeld ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair",
          )}
          style={{ width: displayWidth, height: displayHeight }}
          onPointerDown={onCanvasPointerDown}
        >
          <Image
            src={atlas.imageSrc}
            alt="Sprite sheet"
            width={atlas.width}
            height={atlas.height}
            className="pointer-events-none block max-w-none"
            style={{ width: displayWidth, height: displayHeight }}
            draggable={false}
            unoptimized
          />

          <SelectionDimOverlay
            bounds={bounds}
            scale={scale}
            sheetDisplayWidth={displayWidth}
            sheetDisplayHeight={displayHeight}
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded-md border-2 border-kid-ink bg-kid-panel px-2 py-1 text-xs font-bold disabled:opacity-50"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
