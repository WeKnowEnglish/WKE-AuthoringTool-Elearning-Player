import { GARDEN_SPRITE_ATLAS } from "@/lib/topdown/garden-sprite-atlas";
import {
  WKE_PATH_SPRITE_ATLAS,
  WKE_TERRAIN_SPRITE_ATLAS,
} from "@/lib/topdown/wke-sprite-atlas";
import type { SpriteAtlasConfig } from "@/lib/topdown/types";

export type PreviewAtlasId = "garden" | "wke-path" | "wke-terrain";

export type PreviewAtlasEntry = {
  id: PreviewAtlasId;
  label: string;
  atlas: SpriteAtlasConfig;
  configPath: string;
};

export const PREVIEW_ATLAS_REGISTRY: Record<PreviewAtlasId, PreviewAtlasEntry> = {
  garden: {
    id: "garden",
    label: "Custom garden sheet",
    atlas: GARDEN_SPRITE_ATLAS,
    configPath: "lib/topdown/garden-sprite-atlas.ts",
  },
  "wke-path": {
    id: "wke-path",
    label: "WKE dirt-on-grass path",
    atlas: WKE_PATH_SPRITE_ATLAS,
    configPath: "lib/topdown/wke-sprite-atlas.ts",
  },
  "wke-terrain": {
    id: "wke-terrain",
    label: "WKE example terrain",
    atlas: WKE_TERRAIN_SPRITE_ATLAS,
    configPath: "lib/topdown/wke-sprite-atlas.ts",
  },
};

export function getPreviewAtlasEntry(atlasId: string): PreviewAtlasEntry | undefined {
  return PREVIEW_ATLAS_REGISTRY[atlasId as PreviewAtlasId];
}
