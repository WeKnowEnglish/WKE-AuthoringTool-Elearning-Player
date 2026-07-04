"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  clampSpriteRect,
  clientPointToSheet,
} from "@/lib/topdown/bounds-editor-utils";
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

type Props = {
  atlas: SpriteAtlasConfig;
  bounds: SpriteRect;
  onChange: (next: SpriteRect) => void;
};

const HANDLE_CURSORS: Record<Exclude<Handle, "draw">, string> = {
  move: "move",
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

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

export function SpriteSheetCropCanvas({ atlas, bounds, onChange }: Props) {
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{
    mode: Handle;
    startBounds: SpriteRect;
    startPointer: { x: number; y: number };
    moveOffset?: { x: number; y: number };
    drawAnchor?: { x: number; y: number };
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

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;

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

      if (drag.mode !== "draw" && drag.mode !== "move") {
        onChange(
          resizeRect(
            drag.startBounds,
            drag.mode,
            point,
            atlas.width,
            atlas.height,
          ),
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

  function onCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
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

    dragRef.current = {
      mode: "draw",
      startBounds: bounds,
      startPointer: point,
      drawAnchor: point,
    };
    onChange(
      clampSpriteRect(
        { sx: point.x, sy: point.y, sw: 1, sh: 1 },
        atlas.width,
        atlas.height,
      ),
    );
  }

  const selectionStyle = {
    left: bounds.sx * scale,
    top: bounds.sy * scale,
    width: bounds.sw * scale,
    height: bounds.sh * scale,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-kid-ink/70">
          Drag on the sheet to draw a crop, or drag the box / handles.
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md border-2 border-kid-ink bg-kid-panel px-2 py-1 text-xs font-bold"
            onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))))}
          >
            −
          </button>
          <span className="w-12 text-center font-mono text-xs font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="rounded-md border-2 border-kid-ink bg-kid-panel px-2 py-1 text-xs font-bold"
            onClick={() => setZoom((z) => Math.min(2, Number((z + 0.25).toFixed(2))))}
          >
            +
          </button>
        </div>
      </div>

      <div className="max-h-[min(55vh,28rem)] overflow-auto rounded-lg border-4 border-kid-ink/30 bg-[#2a2a2a] p-2">
        <div
          ref={imageWrapRef}
          className="relative inline-block select-none"
          style={{ width: displayWidth, height: displayHeight }}
          onPointerDown={onCanvasPointerDown}
        >
          <Image
            src={atlas.imageSrc}
            alt="Sprite sheet"
            width={atlas.width}
            height={atlas.height}
            className="pointer-events-none block h-auto max-w-none"
            style={{ width: displayWidth, height: displayHeight }}
            draggable={false}
            unoptimized
          />

          <div className="pointer-events-none absolute inset-0 bg-kid-ink/45" />

          <div
            className="pointer-events-none absolute border-2 border-sky-300 bg-transparent shadow-[0_0_0_9999px_rgba(10,47,134,0.45)]"
            style={selectionStyle}
          >
            {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => (
              <span
                key={handle}
                className={clsx(
                  "absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-kid-ink bg-white",
                  handle === "nw" && "left-0 top-0",
                  handle === "n" && "left-1/2 top-0",
                  handle === "ne" && "left-full top-0",
                  handle === "e" && "left-full top-1/2",
                  handle === "se" && "left-full top-full",
                  handle === "s" && "left-1/2 top-full",
                  handle === "sw" && "left-0 top-full",
                  handle === "w" && "left-0 top-1/2",
                )}
                style={{ cursor: HANDLE_CURSORS[handle] }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
