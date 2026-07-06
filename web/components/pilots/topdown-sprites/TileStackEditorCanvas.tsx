"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef } from "react";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import {
  clampStackPresetToCrop,
  lipRegionInCrop,
  updateWalkInPreset,
  walkBottom,
  type AtlasTileStackPreset,
  type AtlasTileWalk,
} from "@/lib/topdown/atlas-tile-layout";
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
  | "lipLine";

type Props = {
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">;
  bounds: SpriteRect;
  stack: AtlasTileStackPreset;
  onChange: (next: AtlasTileStackPreset) => void;
  displayPx?: number;
  knockOutGutter?: boolean;
};

function walkAsRect(walk: AtlasTileWalk) {
  return {
    x: walk.insetX,
    y: walk.insetY,
    w: walk.width,
    h: walk.height,
  };
}

function hitHandle(
  x: number,
  y: number,
  walk: AtlasTileWalk,
  lipStartY: number,
  cropH: number,
  handleSize = 8,
): Handle | null {
  const within = (px: number, py: number) =>
    x >= px - handleSize &&
    x <= px + handleSize &&
    y >= py - handleSize &&
    y <= py + handleSize;

  if (Math.abs(y - lipStartY) <= handleSize + 2 && x >= 0 && x <= walk.insetX + walk.width + 20) {
    return "lipLine";
  }

  const rect = walkAsRect(walk);
  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;
  const midX = rect.x + rect.w / 2;
  const midY = rect.y + rect.h / 2;

  if (within(left, top)) return "nw";
  if (within(midX, top)) return "n";
  if (within(right, top)) return "ne";
  if (within(right, midY)) return "e";
  if (within(right, bottom)) return "se";
  if (within(midX, bottom)) return "s";
  if (within(left, bottom)) return "sw";
  if (within(left, midY)) return "w";
  if (x >= left && x <= right && y >= top && y <= bottom) return "move";
  void cropH;
  return null;
}

function resizeWalk(
  start: AtlasTileWalk,
  handle: Exclude<Handle, "move" | "lipLine">,
  pointer: { x: number; y: number },
  sw: number,
  sh: number,
): AtlasTileWalk {
  const rect = walkAsRect(start);
  let { x, y, w, h } = rect;
  const right = x + w;
  const bottom = y + h;

  switch (handle) {
    case "e":
      w = Math.max(1, pointer.x - x);
      break;
    case "s":
      h = Math.max(1, pointer.y - y);
      break;
    case "se":
      w = Math.max(1, pointer.x - x);
      h = Math.max(1, pointer.y - y);
      break;
    case "w":
      x = Math.min(pointer.x, right - 1);
      w = right - x;
      break;
    case "n":
      y = Math.min(pointer.y, bottom - 1);
      h = bottom - y;
      break;
    case "nw":
      x = Math.min(pointer.x, right - 1);
      y = Math.min(pointer.y, bottom - 1);
      w = right - x;
      h = bottom - y;
      break;
    case "ne":
      y = Math.min(pointer.y, bottom - 1);
      w = Math.max(1, pointer.x - x);
      h = bottom - y;
      break;
    case "sw":
      x = Math.min(pointer.x, right - 1);
      w = right - x;
      h = Math.max(1, pointer.y - y);
      break;
    default:
      break;
  }

  return clampStackPresetToCrop(
    {
      walk: { insetX: x, insetY: y, width: w, height: h },
      lipStartY: walkBottom({ insetX: x, insetY: y, width: w, height: h }),
      layout: { logicalTilePx: 64, lipOverlapPx: 0, columnOverlapPx: 0 },
    },
    sw,
    sh,
  ).walk;
}

export function TileStackEditorCanvas({
  atlas,
  bounds,
  stack,
  onChange,
  displayPx = 240,
  knockOutGutter = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: Handle;
    startStack: AtlasTileStackPreset;
    startPointer: { x: number; y: number };
    moveOffset?: { x: number; y: number };
  } | null>(null);

  const scale = displayPx / bounds.sw;
  const displayH = Math.round(bounds.sh * scale);
  const lip = lipRegionInCrop(stack, bounds.sh, bounds.sw);

  const toLocalPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round((clientX - rect.left) / scale),
        y: Math.round((clientY - rect.top) / scale),
      };
    },
    [scale],
  );

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const point = toLocalPoint(e.clientX, e.clientY);

      if (drag.mode === "lipLine") {
        const minLip = walkBottom(drag.startStack.walk);
        onChange(
          clampStackPresetToCrop(
            {
              ...drag.startStack,
              lipStartY: Math.max(minLip, Math.min(point.y, bounds.sh)),
            },
            bounds.sw,
            bounds.sh,
          ),
        );
        return;
      }

      if (drag.mode === "move") {
        if (drag.moveOffset) {
          const nextWalk = clampStackPresetToCrop(
            {
              ...drag.startStack,
              walk: {
                ...drag.startStack.walk,
                insetX: point.x - drag.moveOffset.x,
                insetY: point.y - drag.moveOffset.y,
              },
            },
            bounds.sw,
            bounds.sh,
          ).walk;
          onChange(updateWalkInPreset(drag.startStack, nextWalk, bounds.sw, bounds.sh));
        }
        return;
      }

      const nextWalk = resizeWalk(
        drag.startStack.walk,
        drag.mode,
        point,
        bounds.sw,
        bounds.sh,
      );
      onChange(updateWalkInPreset(drag.startStack, nextWalk, bounds.sw, bounds.sh));
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
  }, [bounds.sh, bounds.sw, onChange, toLocalPoint]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const point = toLocalPoint(e.clientX, e.clientY);
    const handle = hitHandle(point.x, point.y, stack.walk, stack.lipStartY, bounds.sh);

    if (handle === "lipLine") {
      dragRef.current = { mode: "lipLine", startStack: stack, startPointer: point };
      return;
    }

    if (handle === "move") {
      dragRef.current = {
        mode: "move",
        startStack: stack,
        startPointer: point,
        moveOffset: { x: point.x - stack.walk.insetX, y: point.y - stack.walk.insetY },
      };
      return;
    }

    if (handle) {
      dragRef.current = { mode: handle, startStack: stack, startPointer: point };
    }
  }

  const walk = stack.walk;

  return (
    <div className="space-y-1">
      <p className="text-[0.65rem] font-semibold text-kid-ink/60">
        Lime = walk surface · Orange band = lip · Drag split line or walk box
      </p>
      <div
        ref={wrapRef}
        className="relative inline-block cursor-crosshair select-none rounded-md bg-[#3a3a3a] p-2"
        style={{ width: displayPx + 16, height: displayH + 16 }}
        onPointerDown={onPointerDown}
      >
        <div className="relative" style={{ width: displayPx, height: displayH }}>
          <TopDownSprite
            atlas={atlas}
            bounds={bounds}
            fillCell
            fillScale={scale}
            knockOutGutter={knockOutGutter}
            alt=""
            className="h-full w-full"
          />

          {lip ?
            <div
              className="pointer-events-none absolute left-0 bg-orange-400/25"
              style={{
                top: lip.y * scale,
                width: displayPx,
                height: lip.h * scale,
              }}
            />
          : null}

          <div
            className="absolute border-2 border-lime-400/90"
            style={{
              left: walk.insetX * scale,
              top: walk.insetY * scale,
              width: walk.width * scale,
              height: walk.height * scale,
            }}
          >
            {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => (
              <span
                key={handle}
                className={clsx(
                  "absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-kid-ink bg-white",
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

          <div
            className="absolute left-0 right-0 cursor-row-resize border-t-2 border-dashed border-orange-400"
            style={{ top: stack.lipStartY * scale - 1, height: 4 }}
            title="Lip split line"
          />
        </div>
      </div>
    </div>
  );
}
