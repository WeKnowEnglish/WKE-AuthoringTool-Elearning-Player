import { buildClozeClause } from "@/lib/secondary/secondary-cloze-clause";
import { groupItemsByTopic, topicTitleForId } from "@/lib/secondary/secondary-cloze-topic-meta";
import type { SecondaryVocabItem } from "@/lib/secondary/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export const SECONDARY_CLOZE_MAX_TOPICS_IN_PARAGRAPH = 2;

const CONNECTIVE_PREFIXES = ["", "Then ", "Also, ", "Next, ", "Finally, "] as const;

const LEADING_CONNECTIVE_PATTERN =
  /^(first|then|also|next|finally|after that|later|meanwhile)[,.]?\s+/i;

export type ClozeTopicPickResult = {
  picked: SecondaryVocabItem[];
  primaryTopicId: string | null;
  isMixedTopic: boolean;
};

function sortTopicsByCount(groups: Map<string, SecondaryVocabItem[]>): string[] {
  return [...groups.entries()]
    .sort((a, b) => {
      const countDiff = b[1].length - a[1].length;
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    })
    .map(([topicId]) => topicId);
}

function orderPickedItems(items: SecondaryVocabItem[]): SecondaryVocabItem[] {
  return [...items].sort((a, b) => {
    const difficultyDiff = a.difficulty - b.difficulty;
    if (difficultyDiff !== 0) return difficultyDiff;
    return a.wordItemId.localeCompare(b.wordItemId);
  });
}

function ensureSentencePunctuation(clause: string): string {
  const trimmed = clause.trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function stripLeadingConnective(clause: string): string {
  return clause.replace(LEADING_CONNECTIVE_PATTERN, "").trim();
}

export function assembleClozeParagraph(clauses: string[]): string {
  const parts = clauses.map((clause, index) => {
    const normalized = ensureSentencePunctuation(stripLeadingConnective(clause));
    const prefix = CONNECTIVE_PREFIXES[Math.min(index, CONNECTIVE_PREFIXES.length - 1)];
    const combined = `${prefix}${normalized}`;
    if (index === 0) {
      return combined.charAt(0).toUpperCase() + combined.slice(1);
    }
    return combined;
  });
  return parts.join(" ");
}

export function buildClozeTitle(primaryTopicId: string | null, isMixedTopic: boolean): string {
  if (!primaryTopicId || isMixedTopic) {
    return "Today's Vocabulary Cloze";
  }
  return `${topicTitleForId(primaryTopicId)} Cloze`;
}

export function pickClozeItemsByTopic(input: {
  pool: SecondaryVocabItem[];
  seed: string;
  minBlanks: number;
  maxBlanks: number;
}): ClozeTopicPickResult | null {
  const { pool, seed, minBlanks, maxBlanks } = input;
  if (pool.length < minBlanks) return null;

  const groups = groupItemsByTopic(pool);
  const rankedTopics = sortTopicsByCount(groups);
  const qualifyingTopics = rankedTopics.filter((topicId) => (groups.get(topicId)?.length ?? 0) >= minBlanks);

  if (qualifyingTopics.length > 0) {
    const topicId = shuffleWithSeed(qualifyingTopics, `${seed}:topic`)[0]!;
    const topicItems = groups.get(topicId) ?? [];
    const picked = shuffleWithSeed(topicItems, `${seed}:words`).slice(0, maxBlanks);
    if (picked.length < minBlanks) return null;
    return {
      picked: orderPickedItems(picked),
      primaryTopicId: topicId,
      isMixedTopic: false,
    };
  }

  if (rankedTopics.length >= 2) {
    const [topicA, topicB] = rankedTopics.slice(0, SECONDARY_CLOZE_MAX_TOPICS_IN_PARAGRAPH);
    const perTopic = Math.ceil(minBlanks / 2);
    const fromA = shuffleWithSeed(groups.get(topicA) ?? [], `${seed}:topic-a`).slice(0, perTopic);
    const fromB = shuffleWithSeed(groups.get(topicB) ?? [], `${seed}:topic-b`).slice(0, perTopic);
    let picked = orderPickedItems([...fromA, ...fromB]);

    if (picked.length < minBlanks) {
      const pickedIds = new Set(picked.map((item) => item.wordItemId));
      const remainder = shuffleWithSeed(
        pool.filter((item) => !pickedIds.has(item.wordItemId)),
        `${seed}:remainder`,
      );
      picked = orderPickedItems([...picked, ...remainder]).slice(0, maxBlanks);
    } else {
      picked = picked.slice(0, maxBlanks);
    }

    if (picked.length < minBlanks) return null;
    return {
      picked,
      primaryTopicId: topicA,
      isMixedTopic: true,
    };
  }

  const picked = orderPickedItems(shuffleWithSeed(pool, `${seed}:words`).slice(0, maxBlanks));
  if (picked.length < minBlanks) return null;
  const primaryTopicId = picked[0]?.topicId ?? null;
  const isMixedTopic = new Set(picked.map((item) => item.topicId)).size > 1;
  return { picked, primaryTopicId, isMixedTopic };
}

export function buildClozeParagraphFromItems(items: SecondaryVocabItem[]): string {
  return assembleClozeParagraph(items.map(buildClozeClause));
}
