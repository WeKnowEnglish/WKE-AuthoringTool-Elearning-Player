import type { PosterExample } from "@/components/grammar/poster/poster-view-model";
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

  return {
    sentence: item.text ?? transformationRow?.to ?? "",
    highlight: item.highlight,
    emoji: item.graphic ?? "❓",
    label: item.caption,
    transformationRow,
  };
}
