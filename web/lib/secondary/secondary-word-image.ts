import {
  pickBestMediaUrlForVocabWord,
  type MediaRow,
  type VocabMediaLookupInput,
} from "@/lib/teststartpage/media-asset-lookup";
import { getSecondaryVocabMediaTopicSlugs } from "@/lib/secondary/secondary-vocab-media-topics";
import { getSecondaryTopicIconUrl } from "@/lib/secondary/secondary-topic-icons";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

export function getSecondaryWordMediaLookupInput(item: SecondaryVocabItem): VocabMediaLookupInput {
  const extraKeys = [item.word];
  if (item.mediaHint?.trim()) {
    extraKeys.push(item.mediaHint.trim());
  }

  return {
    id: item.wordItemId,
    lemma: item.lemma,
    extraKeys,
    topicSlugs: getSecondaryVocabMediaTopicSlugs(item.topicId),
  };
}

export function resolveSecondaryWordImageUrlSync(item: SecondaryVocabItem): string | null {
  const explicit = item.imageUrl?.trim();
  return explicit || null;
}

/** Immediate UI URL: curated image, else topic web icon. */
export function resolveSecondaryWordDisplayImageUrl(item: SecondaryVocabItem): string {
  return resolveSecondaryWordImageUrlSync(item) ?? getSecondaryTopicIconUrl(item.topicId);
}

export function resolveSecondaryWordImageUrlFromRows(
  item: SecondaryVocabItem,
  mediaRows: MediaRow[],
): string {
  const explicit = resolveSecondaryWordImageUrlSync(item);
  if (explicit) return explicit;

  if (mediaRows.length > 0) {
    const mediaUrl = pickBestMediaUrlForVocabWord(getSecondaryWordMediaLookupInput(item), mediaRows);
    if (mediaUrl) return mediaUrl;
  }

  return getSecondaryTopicIconUrl(item.topicId);
}
