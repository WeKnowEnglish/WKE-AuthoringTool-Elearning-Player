import { formatAtlasBoundsExport } from "@/lib/topdown/atlas-tile-layout";
import type { AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import { listWkePathTileIds } from "@/lib/topdown/wke-path-tile-presets";
import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";
import type { SpriteRect } from "@/lib/topdown/types";

export type WkePathTilePick = {
  assetId: WkePathTileId;
  bounds: SpriteRect;
  stack: AtlasTileStackPreset;
};

export type WkePathPicksPayload = {
  tiles: WkePathTilePick[];
};

export function normalizeWkePathPicksPayload(payload: WkePathPicksPayload): WkePathTilePick[] {
  const expected = new Set(listWkePathTileIds());
  const byId = new Map<WkePathTileId, WkePathTilePick>();

  for (const pick of payload.tiles) {
    if (!expected.has(pick.assetId)) {
      throw new Error(`Unknown path tile id: ${pick.assetId}`);
    }
    byId.set(pick.assetId, pick);
  }

  const missing = listWkePathTileIds().filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing path tile picks: ${missing.join(", ")}`);
  }

  return listWkePathTileIds().map((id) => byId.get(id)!);
}

export function formatWkePathStackPresetEntry(
  assetId: string,
  stack: AtlasTileStackPreset,
): string {
  const { walk, lipStartY, layout } = stack;
  return `${assetId}: {
    walk: { insetX: ${walk.insetX}, insetY: ${walk.insetY}, width: ${walk.width}, height: ${walk.height} },
    lipStartY: ${lipStartY},
    layout: { logicalTilePx: ${layout.logicalTilePx}, lipOverlapPx: ${layout.lipOverlapPx}, columnOverlapPx: ${layout.columnOverlapPx} },
  }`;
}

export function renderWkePathAtlasAssetsBlock(picks: WkePathTilePick[]): string {
  return picks.map((pick) => formatAtlasBoundsExport(pick.assetId, pick.bounds)).join("\n    ");
}

export function renderWkePathPresetEntries(picks: WkePathTilePick[]): string {
  return picks.map((pick) => formatWkePathStackPresetEntry(pick.assetId, pick.stack)).join(",\n  ");
}

export function patchWkeSpriteAtlasPathAssets(source: string, picks: WkePathTilePick[]): string {
  const assetsBlock = renderWkePathAtlasAssetsBlock(picks);
  const pattern =
    /(export const WKE_PATH_SPRITE_ATLAS = \{[\s\S]*?assets: \{\n)([\s\S]*?)(\n  \},\n\} as const satisfies SpriteAtlasConfig;)/;

  if (!pattern.test(source)) {
    throw new Error("Could not locate WKE_PATH_SPRITE_ATLAS.assets block in wke-sprite-atlas.ts");
  }

  return source.replace(pattern, `$1    ${assetsBlock}$3`);
}

export function patchWkePathTilePresets(source: string, picks: WkePathTilePick[]): string {
  const entries = renderWkePathPresetEntries(picks);
  const pattern =
    /(export const WKE_PATH_TILE_STACK_PRESETS: Record<WkePathTileId, AtlasTileStackPreset> = \{\n)([\s\S]*?)(\n\};)/;

  if (!pattern.test(source)) {
    throw new Error("Could not locate WKE_PATH_TILE_STACK_PRESETS block in wke-path-tile-presets.ts");
  }

  return source.replace(
    pattern,
    `$1  /** Hand-tuned from path atlas picks — updated via apply-wke-path-picks. */\n  ${entries},\n$3`,
  );
}
