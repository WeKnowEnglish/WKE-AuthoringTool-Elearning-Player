"use client";

import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { resolveTerrainTile } from "@/lib/topdown/resolve-sprite-bounds";
import type { WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

type Props = {
  tileId: WkeTerrainTileId;
  sizePx?: number;
  className?: string;
  alt?: string;
};

export function TerrainTileThumbnail({ tileId, sizePx = 56, className, alt }: Props) {
  const sprite = resolveTerrainTile(tileId);

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
