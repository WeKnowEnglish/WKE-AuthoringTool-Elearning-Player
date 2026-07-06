import { formatAtlasBoundsExport } from "@/lib/topdown/atlas-tile-layout";
import type { AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import {
  listLetterAFruitAssetIds,
  type LetterAFruitAssetKey,
} from "@/lib/topdown/letter-fruit-atlas";
import type { SpriteRect } from "@/lib/topdown/types";

export type LetterFruitTilePick = {
  assetId: LetterAFruitAssetKey;
  bounds: SpriteRect;
  stack: AtlasTileStackPreset;
};

export type LetterFruitPicksPayload = {
  tiles: LetterFruitTilePick[];
};

export function normalizeLetterFruitPicksPayload(
  payload: LetterFruitPicksPayload,
): LetterFruitTilePick[] {
  const expected = new Set(listLetterAFruitAssetIds());
  const byId = new Map<LetterAFruitAssetKey, LetterFruitTilePick>();

  for (const pick of payload.tiles) {
    if (!expected.has(pick.assetId)) {
      throw new Error(`Unknown letter fruit asset id: ${pick.assetId}`);
    }
    byId.set(pick.assetId, pick);
  }

  const missing = listLetterAFruitAssetIds().filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing letter fruit picks: ${missing.join(", ")}`);
  }

  return listLetterAFruitAssetIds().map((id) => byId.get(id)!);
}

export function formatLetterFruitStackPresetEntry(
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

export function renderLetterFruitAtlasAssetsBlock(picks: LetterFruitTilePick[]): string {
  return picks.map((pick) => formatAtlasBoundsExport(pick.assetId, pick.bounds)).join("\n    ");
}

export function renderLetterFruitPresetEntries(picks: LetterFruitTilePick[]): string {
  return picks
    .map((pick) => formatLetterFruitStackPresetEntry(pick.assetId, pick.stack))
    .join(",\n  ");
}

export function patchLetterFruitAtlasAssets(source: string, picks: LetterFruitTilePick[]): string {
  const assetsBlock = renderLetterFruitAtlasAssetsBlock(picks);
  const pattern =
    /(export const LETTER_A_FRUIT_ATLAS = \{[\s\S]*?assets: \{\r?\n)([\s\S]*?)(\r?\n  \},\r?\n\} as const satisfies SpriteAtlasConfig;)/;

  const next = source.replace(
    pattern,
    `$1    ${assetsBlock}$3`,
  );
  if (next === source) {
    throw new Error(
      "Could not locate LETTER_A_FRUIT_ATLAS.assets block in letter-fruit-atlas.ts",
    );
  }
  return next;
}

export function patchLetterFruitOverlayPresets(
  source: string,
  picks: LetterFruitTilePick[],
): string {
  const entries = renderLetterFruitPresetEntries(picks);
  const pattern =
    /(const TUNED_LETTER_A_PRESETS: Partial<[\s\S]*?> = \{\r?\n)([\s\S]*?)(\r?\n\};)/;

  const next = source.replace(
    pattern,
    `$1  /** Hand-tuned from letter fruit atlas picks — updated via apply-letter-fruit-picks. */\r\n  ${entries},\r\n$3`,
  );
  if (next === source) {
    throw new Error(
      "Could not locate TUNED_LETTER_A_PRESETS block in letter-fruit-overlay-presets.ts",
    );
  }
  return next;
}
