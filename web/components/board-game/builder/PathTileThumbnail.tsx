"use client";

import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { resolvePathTile } from "@/lib/topdown/resolve-sprite-bounds";
import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

type Props = {
  tileId: WkePathTileId;
  sizePx?: number;
  className?: string;
  alt?: string;
};

export function PathTileThumbnail({ tileId, sizePx = 56, className, alt }: Props) {
  const sprite = resolvePathTile(tileId);

  return (
    <div
      className={className}
      style={{ width: sizePx, height: sizePx }}
      title={alt ?? tileId}
    >
      <TopDownSprite
        atlas={sprite.atlas}
        bounds={sprite.bounds}
        fillCell
        fillScale={sizePx / sprite.bounds.sw}
        alt={alt ?? tileId}
      />
    </div>
  );
}
