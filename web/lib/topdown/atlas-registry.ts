import { GARDEN_SPRITE_ATLAS } from "@/lib/topdown/garden-sprite-atlas";
import {
  getLetterFruitAtlas,
  getLetterFruitAtlasId,
} from "@/lib/topdown/letter-fruit-atlas";
import {
  getLetterFruitVariant,
  letterFruitSlugFromAtlasId,
} from "@/lib/topdown/letter-fruit-variants";
import {
  WKE_PATH_SPRITE_ATLAS,
  WKE_TERRAIN_SPRITE_ATLAS,
} from "@/lib/topdown/wke-sprite-atlas";
import type { SpriteAtlasConfig } from "@/lib/topdown/types";

export type StaticPreviewAtlasId = "garden" | "wke-path" | "wke-terrain";

export type PreviewAtlasId = StaticPreviewAtlasId | `letter-fruit-${string}`;

export type PreviewAtlasEntry = {
  id: PreviewAtlasId;
  label: string;
  atlas: SpriteAtlasConfig;
  configPath: string;
  stackPresetPath?: string;
};

const STATIC_PREVIEW_ATLAS_REGISTRY: Record<StaticPreviewAtlasId, PreviewAtlasEntry> = {
  garden: {
    id: "garden",
    label: "Custom garden sheet",
    atlas: GARDEN_SPRITE_ATLAS,
    configPath: "lib/topdown/garden-sprite-atlas.ts",
    stackPresetPath: "lib/topdown/garden-overlay-presets.ts",
  },
  "wke-path": {
    id: "wke-path",
    label: "WKE dirt-on-grass path",
    atlas: WKE_PATH_SPRITE_ATLAS,
    configPath: "lib/topdown/wke-sprite-atlas.ts",
    stackPresetPath: "lib/topdown/wke-path-tile-presets.ts",
  },
  "wke-terrain": {
    id: "wke-terrain",
    label: "WKE example terrain",
    atlas: WKE_TERRAIN_SPRITE_ATLAS,
    configPath: "lib/topdown/wke-sprite-atlas.ts",
    stackPresetPath: "lib/topdown/wke-terrain-tile-presets.ts",
  },
};

/** @deprecated Use STATIC_PREVIEW_ATLAS_REGISTRY or getPreviewAtlasEntry */
export const PREVIEW_ATLAS_REGISTRY: Record<string, PreviewAtlasEntry> = {
  ...STATIC_PREVIEW_ATLAS_REGISTRY,
  "letter-fruit-a": {
    id: "letter-fruit-a",
    label: "Letter A fruit stages",
    atlas: getLetterFruitAtlas("a"),
    configPath: "lib/topdown/letter-fruit-atlas.ts",
    stackPresetPath: "lib/topdown/letter-fruit-overlay-presets.ts",
  },
};

export function getPreviewAtlasEntry(atlasId: string): PreviewAtlasEntry | undefined {
  if (atlasId in STATIC_PREVIEW_ATLAS_REGISTRY) {
    return STATIC_PREVIEW_ATLAS_REGISTRY[atlasId as StaticPreviewAtlasId];
  }

  const slug = letterFruitSlugFromAtlasId(atlasId);
  if (!slug) return undefined;

  const variant = getLetterFruitVariant(slug);
  return {
    id: getLetterFruitAtlasId(slug) as PreviewAtlasId,
    label: variant.label,
    atlas: getLetterFruitAtlas(slug),
    configPath: "lib/topdown/letter-fruit-atlas.ts",
    stackPresetPath: "lib/topdown/letter-fruit-overlay-presets.ts",
  };
}
