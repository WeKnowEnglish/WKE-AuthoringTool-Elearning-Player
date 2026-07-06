"use client";

import { useCallback, useEffect, useRef } from "react";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { TopDownStackedIndividualTile } from "@/components/topdown/TopDownIndividualTile";
import { GARDEN_GRID_BG } from "@/lib/garden/garden-map-layout";
import { GARDEN_MAP_LAYOUT } from "@/lib/garden/garden-map-layout";
import { useLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { getLetterFruitAtlas } from "@/lib/topdown/letter-fruit-atlas";
import type { IndividualTileDef } from "@/lib/topdown/individual-tiles";
import {
  computePlotFruitPlacement,
  resizePlotLayerScale,
} from "@/lib/topdown/plot-layer-placement";
import type { PlotFruitLayerPlacement } from "@/lib/topdown/plot-layer-types";
import type { SpriteRect } from "@/lib/topdown/types";

const CELL_PX = GARDEN_MAP_LAYOUT.logicalTilePx;

type Handle = "move" | "se";

type Props = {
  baseTile: IndividualTileDef;
  bounds: SpriteRect;
  layer: PlotFruitLayerPlacement;
  onLayerChange: (next: PlotFruitLayerPlacement) => void;
  displayPx?: number;
};

function hitHandle(
  x: number,
  y: number,
  left: number,
  top: number,
  width: number,
  height: number,
  handleSize = 10,
): Handle | null {
  const within = (px: number, py: number) =>
    x >= px - handleSize &&
    x <= px + handleSize &&
    y >= py - handleSize &&
    y <= py + handleSize;

  if (within(left + width, top + height)) return "se";
  if (x >= left && x <= left + width && y >= top && y <= top + height) return "move";
  return null;
}

export function PlotLayerEditorCanvas({
  baseTile,
  bounds,
  layer,
  onLayerChange,
  displayPx = 256,
}: Props) {
  const { slug } = useLetterFruitSelector();
  const atlas = getLetterFruitAtlas(slug);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: Handle;
    startLayer: PlotFruitLayerPlacement;
    startPointer: { x: number; y: number };
    startDistance?: number;
  } | null>(null);

  const zoom = displayPx / CELL_PX;
  const placement = computePlotFruitPlacement({
    cellPx: CELL_PX,
    cropSw: bounds.sw,
    cropSh: bounds.sh,
    layer,
  });

  const toLocalPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom,
      };
    },
    [zoom],
  );

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const point = toLocalPoint(e.clientX, e.clientY);

      if (drag.mode === "move") {
        onLayerChange({
          ...drag.startLayer,
          offsetX: drag.startLayer.offsetX + (point.x - drag.startPointer.x),
          offsetY: drag.startLayer.offsetY + (point.y - drag.startPointer.y),
        });
        return;
      }

      if (drag.mode === "se" && drag.startDistance != null && drag.startDistance > 0) {
        const startPlacement = computePlotFruitPlacement({
          cellPx: CELL_PX,
          cropSw: bounds.sw,
          cropSh: bounds.sh,
          layer: drag.startLayer,
        });
        const pinX = startPlacement.left + startPlacement.displayW;
        const pinY = startPlacement.top + startPlacement.displayH;
        const distance = Math.hypot(point.x - pinX, point.y - pinY);
        const nextScale = drag.startLayer.scale * (distance / drag.startDistance);
        onLayerChange(
          resizePlotLayerScale({
            cellPx: CELL_PX,
            cropSw: bounds.sw,
            cropSh: bounds.sh,
            layer: drag.startLayer,
            nextScale,
          }),
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
  }, [bounds.sh, bounds.sw, onLayerChange, toLocalPoint]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const point = toLocalPoint(e.clientX, e.clientY);
    const handle = hitHandle(
      point.x,
      point.y,
      placement.left,
      placement.top,
      placement.displayW,
      placement.displayH,
    );

    if (handle === "move") {
      dragRef.current = {
        mode: "move",
        startLayer: layer,
        startPointer: point,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (handle === "se") {
      const pinX = placement.left + placement.displayW;
      const pinY = placement.top + placement.displayH;
      dragRef.current = {
        mode: "se",
        startLayer: layer,
        startPointer: point,
        startDistance: Math.max(1, Math.hypot(point.x - pinX, point.y - pinY)),
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }

  const fruitLeft = placement.left * zoom;
  const fruitTop = placement.top * zoom;
  const fruitW = placement.displayW * zoom;
  const fruitH = placement.displayH * zoom;

  return (
    <div className="space-y-1">
      <p className="text-[0.65rem] font-semibold text-kid-ink/60">
        Drag fruit to move · Drag SE handle to scale · Dashed box = 64px cell
      </p>
      <div
        ref={wrapRef}
        className="relative inline-block cursor-crosshair select-none rounded-md p-4"
        style={{
          width: displayPx + 32,
          height: displayPx + 32,
          backgroundColor: GARDEN_GRID_BG,
        }}
        onPointerDown={onPointerDown}
      >
        <div
          className="relative mx-auto"
          style={{ width: displayPx, height: displayPx }}
        >
          <div
            className="pointer-events-none absolute border-2 border-dashed border-white/70"
            style={{ left: 0, top: 0, width: displayPx, height: displayPx }}
          />

          <div
            className="pointer-events-none absolute left-0 top-0"
            style={{ width: displayPx, height: displayPx }}
          >
            <div
              className="relative origin-top-left"
              style={{
                width: CELL_PX,
                height: CELL_PX,
                transform: `scale(${zoom})`,
              }}
            >
              <TopDownStackedIndividualTile
                tile={baseTile}
                footprint={baseTile.footprint}
                layout={GARDEN_MAP_LAYOUT}
              />
            </div>
          </div>

          <div
            className="absolute"
            style={{
              left: fruitLeft,
              top: fruitTop,
              width: fruitW,
              height: fruitH,
            }}
          >
            <div className="absolute inset-0 border-2 border-lime-400/90 bg-lime-400/10">
              <span
                className="absolute left-full top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-kid-ink bg-white"
                title="Scale"
              />
            </div>
            <TopDownSprite
              atlas={atlas}
              bounds={bounds}
              scale={placement.scale * zoom}
              knockOutGutter
              alt=""
              className="pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
