"use client";

import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { GARDEN_SPRITE_ATLAS } from "@/lib/topdown/garden-sprite-atlas";
import {
  spriteBackgroundPosition,
  spriteBackgroundSize,
} from "@/lib/topdown/sprite-utils";
import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

type Props = {
  atlas?: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">;
  bounds: SpriteRect;
  className?: string;
  alt?: string;
  /** Scale multiplier applied to sw/sh (default 1). */
  scale?: number;
  /** When true, stretch sprite to fill a square cell (seamless maps). */
  fillCell?: boolean;
};

export function spriteBackgroundStyle(
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">,
  bounds: SpriteRect,
): CSSProperties {
  return {
    backgroundImage: `url("${atlas.imageSrc}")`,
    backgroundPosition: spriteBackgroundPosition(bounds),
    backgroundSize: spriteBackgroundSize(atlas),
    backgroundRepeat: "no-repeat",
    width: bounds.sw,
    height: bounds.sh,
  };
}

export function TopDownSprite({
  atlas = GARDEN_SPRITE_ATLAS,
  bounds,
  className,
  alt,
  scale = 1,
  fillCell = false,
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
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url("${atlas.imageSrc}")`,
            backgroundPosition: spriteBackgroundPosition(bounds),
            backgroundSize: spriteBackgroundSize(atlas),
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx("relative shrink-0 overflow-hidden", className)}
      style={{
        width: bounds.sw * scale,
        height: bounds.sh * scale,
      }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          ...spriteBackgroundStyle(atlas, bounds),
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
}
