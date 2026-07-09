import { getSecondaryTopicTitle } from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

export function topicTitleForId(topicId: string): string {
  return getSecondaryTopicTitle(topicId);
}

export function groupItemsByTopic(items: SecondaryVocabItem[]): Map<string, SecondaryVocabItem[]> {
  const groups = new Map<string, SecondaryVocabItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.topicId) ?? [];
    bucket.push(item);
    groups.set(item.topicId, bucket);
  }
  return groups;
}

export function listTopicIdsInPool(items: SecondaryVocabItem[]): string[] {
  return [...new Set(items.map((item) => item.topicId))].sort();
}
