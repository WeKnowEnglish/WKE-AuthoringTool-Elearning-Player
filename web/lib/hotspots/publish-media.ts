import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";
import {
  dataUrlToBlob,
  publishVocabStudioAsset,
} from "@/lib/activity-builder/vocabulary-list/publishMedia";

function isDataUrl(value: string | undefined): value is string {
  return Boolean(value?.trim().startsWith("data:"));
}

function extensionFromDataUrl(dataUrl: string, fallback: string): string {
  const mime = dataUrl.slice(5, dataUrl.indexOf(";")).toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return fallback;
}

function mediaRoleForHotspotAsset(
  document: ExploreHotspotsDocument,
  assetId: string,
): "background" | "scene" {
  const usedAsPhaseBackground = (document.interaction.phases ?? []).some(
    (phase) => phase.imageAssetId === assetId,
  );
  return usedAsPhaseBackground ? "background" : "scene";
}

export function countLocalHotspotMedia(document: ExploreHotspotsDocument): number {
  return document.assets.filter((asset) => isDataUrl(asset.src)).length;
}

/** Upload data-URL assets to studio_assets (+ media library bridge) before bank save. */
export async function publishLocalHotspotMedia(
  document: ExploreHotspotsDocument,
): Promise<ExploreHotspotsDocument> {
  const assets = [...document.assets];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    if (!isDataUrl(asset.src)) continue;
    const blob = await dataUrlToBlob(asset.src);
    const ext = extensionFromDataUrl(asset.src, "png");
    const mediaRole = mediaRoleForHotspotAsset(document, asset.id);
    const uploaded = await publishVocabStudioAsset({
      file: blob,
      filename: `${asset.id}.${ext}`,
      kind: "image",
      meta: {
        source: "explore_hotspots",
        via: "explore_hotspots_workspace",
        assetId: asset.id,
        mediaRole,
        ...(asset.alt?.trim() ? { alt: asset.alt.trim(), word: asset.alt.trim() } : {}),
      },
    });
    assets[i] = {
      ...asset,
      src: uploaded.public_url,
      ...(uploaded.media_asset_id ? { mediaAssetId: uploaded.media_asset_id } : {}),
    };
  }
  return { ...document, assets };
}
