"use client";

import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  useBoundsOverride,
  useResolvedSpriteBounds,
} from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import type { PreviewAtlasId } from "@/lib/topdown/atlas-registry";
import { getAtlasRect } from "@/lib/topdown/sprite-utils";
import type { SeamlessMapPreviewDef } from "@/lib/topdown/preview-seamless-maps";
import { SEAMLESS_MAP_TILE_PX } from "@/lib/topdown/preview-seamless-maps";
import type { SpriteRect } from "@/lib/topdown/types";

type Props = {
  map: SeamlessMapPreviewDef;
};

function SeamlessMapTile({
  mapId,
  assetId,
  fallback,
  atlas,
}: {
  mapId: PreviewAtlasId;
  assetId: string;
  fallback: SpriteRect;
  atlas: SeamlessMapPreviewDef["atlas"];
}) {
  const { openEditor } = useBoundsOverride();
  const bounds = useResolvedSpriteBounds(mapId, assetId, fallback);

  return (
    <div
      className="cursor-pointer hover:outline hover:outline-2 hover:outline-sky-400"
      style={{ width: SEAMLESS_MAP_TILE_PX, height: SEAMLESS_MAP_TILE_PX }}
      title={`${assetId} — double-click to edit`}
      onDoubleClick={() =>
        openEditor({
          atlasId: mapId,
          assetId,
          label: assetId,
        })
      }
    >
      <TopDownSprite
        atlas={atlas}
        bounds={bounds}
        fillCell
        fillScale={SEAMLESS_MAP_TILE_PX / bounds.sw}
        alt=""
      />
    </div>
  );
}

export function SeamlessMapGrid({ map }: Props) {
  const cols = map.tiles[0]?.length ?? 0;
  const mapId = map.id as PreviewAtlasId;

  return (
    <KidPanel className="overflow-x-auto p-3 sm:p-4">
      <div
        className="mx-auto w-fit bg-[#3a3a3a]"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${SEAMLESS_MAP_TILE_PX}px)`,
          gap: 0,
          lineHeight: 0,
        }}
        aria-label={`${map.title} seamless map preview`}
      >
        {map.tiles.flatMap((row, rowIndex) =>
          row.map((assetId, colIndex) => {
            const fallback = getAtlasRect(map.atlas, assetId);
            if (!fallback) {
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="bg-red-900/40"
                  style={{ width: SEAMLESS_MAP_TILE_PX, height: SEAMLESS_MAP_TILE_PX }}
                  title={`Missing: ${assetId}`}
                />
              );
            }

            return (
              <SeamlessMapTile
                key={`${rowIndex}-${colIndex}`}
                mapId={mapId}
                assetId={assetId}
                fallback={fallback}
                atlas={map.atlas}
              />
            );
          }),
        )}
      </div>
      <p className="mt-2 text-center font-mono text-[0.65rem] text-kid-ink/60">
        Config: {map.configPath} · double-click a tile to edit bounds
      </p>
    </KidPanel>
  );
}
