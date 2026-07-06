"use client";

import { clsx } from "clsx";
import { useEffect, useState, type CSSProperties } from "react";
import { GARDEN_SPRITE_ATLAS } from "@/lib/topdown/garden-sprite-atlas";
import { getGutterKeyedCropDataUrl, gutterKeyOptionsForAtlas } from "@/lib/topdown/gutter-key-sprite";
import { atlasCropLayerStyle } from "@/lib/topdown/sprite-utils";
import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

function spriteDisplaySize(bounds: SpriteRect, scale: number) {
  return {
    width: Math.round(bounds.sw * scale),
    height: Math.round(bounds.sh * scale),
  };
}

type Props = {
  atlas?: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">;
  bounds: SpriteRect;
  className?: string;
  alt?: string;
  /** Scale multiplier applied to sw/sh (default 1). */
  scale?: number;
  /** When true, stretch sprite to fill a square cell (seamless maps). */
  fillCell?: boolean;
  /**
   * Display scale for fillCell — maps crop sw×sh to container width.
   * Defaults to 1 (container equals crop size in px). Pass containerWidth / bounds.sw.
   */
  fillScale?: number;
  /** Key sheet gutter color to alpha — for loose atlas crops (tools, weeds). */
  knockOutGutter?: boolean;
};

export function spriteBackgroundStyle(
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">,
  bounds: SpriteRect,
): CSSProperties {
  return {
    ...atlasCropLayerStyle(atlas, bounds, 1),
    width: bounds.sw,
    height: bounds.sh,
  };
}

function GutterKeyedSpriteLayer({
  atlas,
  bounds,
  scale,
}: {
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">;
  bounds: SpriteRect;
  scale: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const gutterKeyOptions = gutterKeyOptionsForAtlas(atlas);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    getGutterKeyedCropDataUrl(atlas, bounds, undefined, gutterKeyOptions)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [atlas, bounds.sx, bounds.sy, bounds.sw, bounds.sh, gutterKeyOptions.isBackground, gutterKeyOptions.keyInteriorHoles]);

  const size = spriteDisplaySize(bounds, scale);

  if (!src) {
    return (
      <div
        className="absolute left-0 top-0"
        style={size}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- canvas-derived transparent crop
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute left-0 top-0 max-w-none"
      style={size}
    />
  );
}

export function TopDownSprite({
  atlas = GARDEN_SPRITE_ATLAS,
  bounds,
  className,
  alt,
  scale = 1,
  fillCell = false,
  fillScale = 1,
  knockOutGutter = false,
}: Props) {
  const decorative = alt == null || alt === "";

  if (fillCell) {
    return (
      <div
        className={clsx("relative h-full w-full overflow-hidden", className)}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative ? true : undefined}
      >
        {knockOutGutter ?
          <GutterKeyedSpriteLayer atlas={atlas} bounds={bounds} scale={fillScale} />
        : <div
            className="absolute left-0 top-0 bg-no-repeat"
            style={atlasCropLayerStyle(atlas, bounds, fillScale)}
          />
        }
      </div>
    );
  }

  return (
    <div
      className={clsx("relative shrink-0 overflow-hidden", className)}
      style={spriteDisplaySize(bounds, scale)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
    >
      {knockOutGutter ?
        <GutterKeyedSpriteLayer atlas={atlas} bounds={bounds} scale={scale} />
      : <div
          className="absolute left-0 top-0 bg-no-repeat"
          style={atlasCropLayerStyle(atlas, bounds, scale)}
        />
      }
    </div>
  );
}
