import type { PosterExample } from "@/components/grammar/poster/poster-view-model";
import { sanitizeGrammarGraphicUrl } from "./graphic-asset";
import type { GrammarItem } from "./schema";

export function mapPosterItem(item: GrammarItem): PosterExample {
  const transformationRow = item.transformationRow
    ? {
        from: item.transformationRow.from,
        operator: item.transformationRow.operator,
        suffix: item.transformationRow.suffix,
        to: item.transformationRow.to,
        emoji: item.transformationRow.graphic,
        ipa: item.transformationRow.ipa,
      }
    : undefined;

  const asset = item.graphicAsset;
  const imageUrl =
    asset?.kind === "url" ? sanitizeGrammarGraphicUrl(asset.value) : undefined;
  const emoji =
    asset?.kind === "emoji" ? asset.value
    : item.graphic ? item.graphic
    : "❓";

  return {
    sentence: item.text ?? transformationRow?.to ?? "",
    highlight: item.highlight,
    emoji,
    ...(imageUrl ? { imageUrl } : {}),
    label: item.caption,
    align: item.align ?? "center",
    ...(transformationRow ? { transformationRow } : {}),
  };
}
