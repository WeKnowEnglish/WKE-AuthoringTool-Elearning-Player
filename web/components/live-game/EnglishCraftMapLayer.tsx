"use client";

import { memo, type ReactNode } from "react";
import { clsx } from "clsx";
import { GrassTilemapLayer } from "@/components/live-game/GrassTilemapLayer";
import { ENGLISH_CRAFT_RIVER_OVERLAY } from "@/lib/live-game/modes/english-craft/map-v1";
import { ENGLISH_CRAFT_PERIMETER_WATER_OVERLAYS } from "@/lib/live-game/modes/english-craft/tilemap-v1";
import { LIVE_GAME_GROUND_COLOR } from "@/lib/live-game/tiles/grass-tile-pack";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

function pctX(x: number, mapW: number): string {
  return `${(x / mapW) * 100}%`;
}

function pctY(y: number, mapH: number): string {
  return `${(y / mapH) * 100}%`;
}

function pctW(w: number, mapW: number): string {
  return `${(w / mapW) * 100}%`;
}

function pctH(h: number, mapH: number): string {
  return `${(h / mapH) * 100}%`;
}

type Props = {
  map: LiveGameMapDef;
  className?: string;
  children?: ReactNode;
  /** Scale map to cover the viewport (no letterboxing). */
  coverViewport?: boolean;
  /** Fill the parent box (used with camera zoom). */
  fillParent?: boolean;
};

export const EnglishCraftMapLayer = memo(EnglishCraftMapLayerInner);

function EnglishCraftMapLayerInner({
  map,
  className,
  children,
  coverViewport = false,
  fillParent = false,
}: Props) {
  const { widthPx, heightPx, tilemap } = map;
  const aspect = widthPx / heightPx;

  const coverStyle =
    coverViewport ?
      {
        aspectRatio: `${widthPx} / ${heightPx}`,
        width: `max(100vw, calc(100dvh * ${aspect}))`,
        height: `max(100dvh, calc(100vw / ${aspect}))`,
      }
    : fillParent ?
      undefined
    : { aspectRatio: `${widthPx} / ${heightPx}` };

  return (
    <div
      className={clsx(
        "relative overflow-hidden",
        coverViewport ?
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        : fillParent ?
          "h-full w-full"
        : "mx-auto w-full max-w-4xl rounded-xl border-4 border-kid-ink shadow-md",
        className,
      )}
      style={{
        ...(coverViewport ? coverStyle : fillParent ? undefined : { aspectRatio: `${widthPx} / ${heightPx}` }),
        backgroundColor: LIVE_GAME_GROUND_COLOR,
      }}
    >
      {tilemap ?
        <>
          <GrassTilemapLayer />
          {ENGLISH_CRAFT_PERIMETER_WATER_OVERLAYS.map((overlay, index) => (
            <div
              key={`perimeter-water-${index}`}
              className="pointer-events-none absolute z-[1] bg-gradient-to-b from-sky-300/90 via-sky-500/95 to-sky-700/95 shadow-inner"
              style={{
                left: pctX(overlay.x, widthPx),
                top: pctY(overlay.y, heightPx),
                width: pctW(overlay.w, widthPx),
                height: pctH(overlay.h, heightPx),
              }}
              aria-hidden
            />
          ))}
          <div
            className="pointer-events-none absolute z-[1] rounded-sm bg-gradient-to-b from-sky-300/90 via-sky-500/95 to-sky-700/95 shadow-inner"
            style={{
              left: pctX(ENGLISH_CRAFT_RIVER_OVERLAY.x, widthPx),
              top: pctY(ENGLISH_CRAFT_RIVER_OVERLAY.y, heightPx),
              width: pctW(ENGLISH_CRAFT_RIVER_OVERLAY.w, widthPx),
              height: pctH(ENGLISH_CRAFT_RIVER_OVERLAY.h, heightPx),
            }}
            aria-hidden
          />
        </>
      : null}

      {children}
    </div>
  );
}
