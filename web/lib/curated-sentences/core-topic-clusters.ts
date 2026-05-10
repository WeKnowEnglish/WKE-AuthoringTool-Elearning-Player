/**
 * Maps the six student menu topics to vocabulary slugs and CSV tag hints.
 */

import type { IndexedSentenceRow, QuizTopicId, VocabTopicId } from "./quiz-compiler-types";

export type MenuTopicCluster = {
  vocabSlugs: VocabTopicId[];
  /** Exact match on a pipe-split tag token (lowercase). */
  tagHints: string[];
  /** Lowercase substring on `tags.join("|").toLowerCase()` — use sparingly. */
  tagSubstringHints?: string[];
  /** Exact `structure_id` values (case-insensitive) that belong to this core. */
  structureIdHints?: string[];
};

export const MENU_TOPIC_CLUSTERS: Record<QuizTopicId, MenuTopicCluster> = {
  food: {
    vocabSlugs: ["food", "drinks", "kitchen"],
    tagHints: [
      "food",
      "eat",
      "eating",
      "fruit",
      "meal",
      "hungry",
      "breakfast",
      "lunch",
      "dinner",
      "drink",
      "juice",
      "milk",
    ],
    tagSubstringHints: ["food", "eat", "fruit", "meal", "hungry", "breakfast", "lunch"],
  },
  school: {
    vocabSlugs: ["school", "classroom_commands", "communication", "art", "objects"],
    tagHints: [
      "school",
      "greeting",
      "teacher",
      "classroom",
      "student",
      "homework",
      "pencil",
      "pen",
      "book",
      "read",
      "art",
    ],
    structureIdHints: ["greetings"],
  },
  animals: {
    /** `nature` alone pulls trees/weather/etc.; keep menu focused on creatures. */
    vocabSlugs: ["animals"],
    tagHints: ["animal", "animals", "pet", "pets", "zoo", "bird", "fish", "cat", "dog"],
  },
  weather: {
    vocabSlugs: ["weather"],
    tagHints: ["weather", "rain", "snow", "sun", "wind", "cloud", "hot", "cold", "warm"],
  },
  clothes: {
    vocabSlugs: ["clothes"],
    tagHints: ["clothes", "shirt", "shoe", "shoes", "hat", "dress", "wear", "jacket", "socks"],
  },
  actions: {
    /**
     * Omit toys/games/sports/play as vocab slugs — they mostly tag nouns (ball, doll) and
     * flood the pool. Verbs still match via `pos === "verb"` and grammar patterns below.
     */
    vocabSlugs: ["actions", "movement", "activities", "routines"],
    tagHints: [
      "run",
      "jump",
      "walk",
      "play",
      "sport",
      "dance",
      "swim",
      "movement",
      "present_continuous",
    ],
  },
};

const VOCAB_SET_CACHE: Partial<Record<QuizTopicId, Set<VocabTopicId>>> = {};

export function menuTopicVocabSet(topic: QuizTopicId): Set<VocabTopicId> {
  let s = VOCAB_SET_CACHE[topic];
  if (!s) {
    s = new Set(MENU_TOPIC_CLUSTERS[topic].vocabSlugs);
    VOCAB_SET_CACHE[topic] = s;
  }
  return s;
}

/** Whether any CSV tag token matches this menu topic's hints. */
export function rowTagTokensMatchCluster(row: IndexedSentenceRow, topic: QuizTopicId): boolean {
  const def = MENU_TOPIC_CLUSTERS[topic];
  const tokens = row.tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
  for (const h of def.tagHints) {
    if (tokens.includes(h)) return true;
  }
  if (def.tagSubstringHints?.length) {
    const joined = row.tags.join("|").toLowerCase();
    for (const sub of def.tagSubstringHints) {
      if (joined.includes(sub)) return true;
    }
  }
  return false;
}

export function rowStructureIdMatchesCluster(row: IndexedSentenceRow, topic: QuizTopicId): boolean {
  const hints = MENU_TOPIC_CLUSTERS[topic].structureIdHints;
  if (!hints?.length) return false;
  const sid = row.structure_id.trim().toLowerCase();
  return hints.some((h) => h.toLowerCase() === sid);
}
