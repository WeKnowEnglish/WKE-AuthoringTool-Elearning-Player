import type { GrammarAlign, GrammarGraphicAsset, GrammarItem } from "../schema";
import { isAllowedGrammarGraphicUrl } from "../graphic-asset";

/** Sync emoji graphic + graphicAsset for legacy + new render paths. */
export function patchItemEmojiGraphic(value: string): Partial<GrammarItem> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { graphic: undefined, graphicAsset: undefined };
  }
  return {
    graphic: trimmed,
    graphicAsset: { kind: "emoji", value: trimmed },
  };
}

/** Set or clear a URL graphic asset. Keeps emoji graphic as fallback. */
export function patchItemUrlGraphic(value: string): Partial<GrammarItem> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { graphicAsset: undefined };
  }
  if (!isAllowedGrammarGraphicUrl(trimmed)) {
    return { graphicAsset: { kind: "url", value: trimmed } };
  }
  return { graphicAsset: { kind: "url", value: trimmed } };
}

export function resolveItemEmoji(item: GrammarItem | undefined): string {
  if (item?.graphicAsset?.kind === "emoji") {
    return item.graphicAsset.value;
  }
  return item?.graphic ?? "";
}

export function resolveItemImageUrl(item: GrammarItem | undefined): string {
  if (item?.graphicAsset?.kind === "url") {
    return item.graphicAsset.value;
  }
  return "";
}

export function resolveItemAlign(item: GrammarItem | undefined): GrammarAlign {
  return item?.align ?? "center";
}

export function resolveGraphicAssetDisplay(
  asset: GrammarGraphicAsset | undefined,
  fallbackGraphic?: string,
): { emoji: string; imageUrl: string } {
  if (asset?.kind === "url") {
    return { emoji: fallbackGraphic ?? "", imageUrl: asset.value };
  }
  if (asset?.kind === "emoji") {
    return { emoji: asset.value, imageUrl: "" };
  }
  return { emoji: fallbackGraphic ?? "", imageUrl: "" };
}
