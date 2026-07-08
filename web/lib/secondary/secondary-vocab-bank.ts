import {
  g7A2MvpClozeTemplates,
  g7A2MvpCoreVocabPack,
} from "@/lib/secondary/secondary-vocabulary-seed";
import type {
  SecondaryClozeTemplate,
  SecondaryVocabItem,
  SecondaryVocabPack,
} from "@/lib/secondary/types";

export function getDefaultSecondaryVocabPack(): SecondaryVocabPack {
  return g7A2MvpCoreVocabPack;
}

export function getAllSecondaryVocabItems(
  pack: SecondaryVocabPack = getDefaultSecondaryVocabPack(),
): SecondaryVocabItem[] {
  return pack.topics.flatMap((topic) => topic.sets.flatMap((set) => set.items));
}

export function getSecondaryVocabItemById(
  wordItemId: string,
  pack: SecondaryVocabPack = getDefaultSecondaryVocabPack(),
): SecondaryVocabItem | undefined {
  return getAllSecondaryVocabItems(pack).find((item) => item.wordItemId === wordItemId);
}

export function getSecondaryVocabItemsByIds(
  wordItemIds: string[],
  pack: SecondaryVocabPack = getDefaultSecondaryVocabPack(),
): SecondaryVocabItem[] {
  const byId = new Map(getAllSecondaryVocabItems(pack).map((item) => [item.wordItemId, item]));
  return wordItemIds
    .map((id) => byId.get(id))
    .filter((item): item is SecondaryVocabItem => Boolean(item));
}

export function getAllSecondaryWordItemIds(
  pack: SecondaryVocabPack = getDefaultSecondaryVocabPack(),
): string[] {
  return getAllSecondaryVocabItems(pack).map((item) => item.wordItemId);
}

export function getSecondaryClozeTemplates(): SecondaryClozeTemplate[] {
  return g7A2MvpClozeTemplates;
}

export function resolveWordItemIdFromLegacyWord(word: string): string | undefined {
  const normalized = word.trim().toLowerCase();
  return getAllSecondaryVocabItems().find(
    (item) =>
      item.word.toLowerCase() === normalized || item.lemma.toLowerCase() === normalized,
  )?.wordItemId;
}
