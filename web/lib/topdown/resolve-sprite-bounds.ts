import { getPreviewAtlasEntry, type PreviewAtlasId } from "@/lib/topdown/atlas-registry";
import { clampStackPresetToCrop, type AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import { getWkePathStackPreset } from "@/lib/topdown/wke-path-tile-presets";
import { getWkeTerrainStackPreset } from "@/lib/topdown/wke-terrain-tile-presets";
import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";
import type { WkePathTileId, WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

export type BoardAtlasId = Extract<PreviewAtlasId, "wke-terrain" | "wke-path">;

export const BOARD_TILE_LOGICAL_PX = 64;

export type ResolvedBoardSprite = {
  atlasId: BoardAtlasId;
  assetId: string;
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">;
  bounds: SpriteRect;
  stack: AtlasTileStackPreset;
};

export class SpriteResolveError extends Error {
  readonly atlasId: string;
  readonly assetId: string;
  readonly reason: string;

  constructor(atlasId: string, assetId: string, reason: string) {
    super(`resolveSpriteBounds: ${reason} (${atlasId}:${assetId})`);
    this.name = "SpriteResolveError";
    this.atlasId = atlasId;
    this.assetId = assetId;
    this.reason = reason;
  }
}

export function isBoardAtlasId(atlasId: string): atlasId is BoardAtlasId {
  return atlasId === "wke-terrain" || atlasId === "wke-path";
}

export function atlasIdForAsset(assetId: string): BoardAtlasId | undefined {
  if (assetId.startsWith("path_r")) return "wke-path";
  if (assetId.startsWith("wke_")) return "wke-terrain";
  return undefined;
}

function atlasRefForBoardAtlas(atlasId: BoardAtlasId): Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height"> {
  const entry = getPreviewAtlasEntry(atlasId);
  if (!entry) {
    throw new SpriteResolveError(atlasId, "", "unknown atlas");
  }
  return entry.atlas;
}

export function resolveSpriteBounds(atlasId: BoardAtlasId, assetId: string): SpriteRect {
  const entry = getPreviewAtlasEntry(atlasId);
  const rect = entry?.atlas.assets[assetId];
  if (!rect) {
    throw new SpriteResolveError(atlasId, assetId, "missing bounds");
  }
  return rect;
}

export function resolveStackPreset(
  atlasId: BoardAtlasId,
  assetId: string,
  bounds: SpriteRect = resolveSpriteBounds(atlasId, assetId),
): AtlasTileStackPreset {
  const preset =
    atlasId === "wke-terrain"
      ? getWkeTerrainStackPreset(assetId, bounds.sw, bounds.sh)
      : getWkePathStackPreset(assetId, bounds.sw, bounds.sh);
  return clampStackPresetToCrop(preset, bounds.sw, bounds.sh);
}

export function resolveBoardSprite(atlasId: BoardAtlasId, assetId: string): ResolvedBoardSprite {
  const bounds = resolveSpriteBounds(atlasId, assetId);
  return {
    atlasId,
    assetId,
    atlas: atlasRefForBoardAtlas(atlasId),
    bounds,
    stack: resolveStackPreset(atlasId, assetId, bounds),
  };
}

export function resolveTerrainTile(id: WkeTerrainTileId): ResolvedBoardSprite {
  return resolveBoardSprite("wke-terrain", id);
}

export function resolvePathTile(id: WkePathTileId): ResolvedBoardSprite {
  return resolveBoardSprite("wke-path", id);
}

export function assertBoardTilemapResolvable(tilemap: BoardTilemap): void {
  for (const row of tilemap.terrain) {
    for (const id of row) {
      resolveTerrainTile(id);
    }
  }
  for (const row of tilemap.path) {
    for (const id of row) {
      if (id) resolvePathTile(id);
    }
  }
}
