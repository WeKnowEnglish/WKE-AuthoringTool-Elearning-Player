/**
 * Topic + CEFR / difficulty filtering with strict-to-loose tiers and synthetic rows.
 */

import type { VocabularyEntry } from "./master-vocabulary";
import {
  menuTopicVocabSet,
  rowStructureIdMatchesCluster,
  rowTagTokensMatchCluster,
} from "./core-topic-clusters";
import { normalizeLemmaKey } from "./quiz-compiler-loader";
import {
  type IndexedSentenceRow,
  type NormalizedSentenceRow,
  type QuizCompilerFilterTier,
  type QuizTopicId,
  type VocabTopicId,
} from "./quiz-compiler-types";

/**
 * Grammar patterns where the target is usually a verb / doing — not state (be + adjective),
 * prepositions, or possession frames.
 */
const ACTIONS_STRUCTURE_IDS = new Set([
  "abilities_modal",
  "present_continuous",
  "daily_routines_actions",
  "classroom_commands",
  "likes_preferences",
  "wh_questions",
]);

function vocabularyTopicsMatchMenuTopic(v: VocabularyEntry | null | undefined, topic: QuizTopicId): boolean {
  if (!v) return false;
  const set = menuTopicVocabSet(topic);
  return v.topics.some((t) => set.has(t as VocabTopicId));
}

/** Whether a vocabulary entry supports the menu topic (for synthetic rows + distractors). */
export function vocabEntryMatchesTopic(entry: VocabularyEntry, topic: QuizTopicId): boolean {
  if (vocabularyTopicsMatchMenuTopic(entry, topic)) return true;
  if (topic === "actions" && entry.pos === "verb") return true;
  return false;
}

function rowMatchesMenuTopicNonActions(row: IndexedSentenceRow, topic: QuizTopicId): boolean {
  const v = row.vocabulary;
  if (vocabularyTopicsMatchMenuTopic(v, topic)) return true;
  const sid = row.structure_id.trim().toLowerCase();
  if (sid === topic) return true;
  if (rowStructureIdMatchesCluster(row, topic)) return true;
  if (rowTagTokensMatchCluster(row, topic)) return true;
  return false;
}

export function rowMatchesTopic(row: IndexedSentenceRow, topic: QuizTopicId): boolean {
  if (topic === "actions") {
    if (rowMatchesMenuTopicNonActions(row, "actions")) return true;
    if (row.vocabulary?.pos === "verb") return true;
    if (ACTIONS_STRUCTURE_IDS.has(row.structure_id)) return true;
    return false;
  }
  return rowMatchesMenuTopicNonActions(row, topic);
}

export function rowUsableForQuestion(row: IndexedSentenceRow): boolean {
  if (!row.target_word || !row.sentence || row.target_word.length === 0) return false;
  return row.sentence.toLowerCase().includes(row.target_word.toLowerCase());
}

export function filterByTier(
  rows: IndexedSentenceRow[],
  topic: QuizTopicId,
  tier: QuizCompilerFilterTier,
): IndexedSentenceRow[] {
  return rows.filter((r) => {
    if (!rowMatchesTopic(r, topic)) return false;
    if (tier === "synthetic_vocab") return false;

    if (tier === "strict") {
      if (r.cefr !== "a1") return false;
      if (r.difficulty == null || r.difficulty > 2) return false;
    } else if (tier === "tags_relaxed") {
      if (r.cefr !== "a1") return false;
    } else if (tier === "difficulty_relaxed") {
      if (r.cefr != null && r.cefr !== "a1" && r.cefr !== "pre_a1") return false;
    }
    // topic_only: no extra filters
    return true;
  });
}

export function pickCandidatesWithFallback(
  indexed: IndexedSentenceRow[],
  topic: QuizTopicId,
  vocabularyEntries: VocabularyEntry[],
  minPoolSize = 3,
): { rows: IndexedSentenceRow[]; tier: QuizCompilerFilterTier; warnings: string[] } {
  const warnings: string[] = [];
  const tiers: QuizCompilerFilterTier[] = [
    "strict",
    "tags_relaxed",
    "difficulty_relaxed",
    "topic_only",
  ];
  const need = Math.max(3, minPoolSize);

  for (const tier of tiers) {
    const pool = filterByTier(indexed, topic, tier).filter(rowUsableForQuestion);
    if (pool.length >= need) {
      return { rows: pool, tier, warnings };
    }
    warnings.push(`Tier ${tier}: only ${pool.length} usable rows (need ${need}).`);
  }

  const synthetic = buildSyntheticRows(topic, vocabularyEntries);
  if (synthetic.length > 0) {
    warnings.push(`Using ${synthetic.length} synthetic rows from vocabulary examples.`);
    return { rows: synthetic, tier: "synthetic_vocab", warnings };
  }

  const lastResort = indexed.filter(rowUsableForQuestion);
  warnings.push(`Falling back to any sentence with target_word (${lastResort.length} rows).`);
  return { rows: lastResort, tier: "topic_only", warnings };
}

function pickVariantLemmasForSynthetic(
  entry: VocabularyEntry,
  allEntries: VocabularyEntry[],
  topic: QuizTopicId,
  max: number,
): string[] {
  const out = new Set<string>();
  for (const e of allEntries) {
    if (e.id === entry.id) continue;
    if (!vocabEntryMatchesTopic(e, topic)) continue;
    out.add(e.lemma);
    if (out.size >= max) break;
  }
  return [...out];
}

function buildSyntheticRows(topic: QuizTopicId, allEntries: VocabularyEntry[]): IndexedSentenceRow[] {
  const pool: IndexedSentenceRow[] = [];
  for (const e of allEntries) {
    if (!vocabEntryMatchesTopic(e, topic)) continue;
    const ex = e.example_sentence?.trim();
    if (!ex) continue;
    const lemma = e.lemma;
    if (!ex.toLowerCase().includes(lemma.toLowerCase())) continue;

    const variants = pickVariantLemmasForSynthetic(e, allEntries, topic, 8);
    const normalized: NormalizedSentenceRow = {
      sentence: ex,
      target_word: lemma,
      acceptable_targets: [],
      variant_lexemes: variants.filter((x) => normalizeLemmaKey(x) !== normalizeLemmaKey(lemma)),
      structure_id: "synthetic_vocab",
      tags: ["synthetic"],
      cefr: e.cefr,
      difficulty: e.difficulty,
      variant_group: "",
      rowIndex: -1000 - pool.length,
    };
    pool.push({
      ...normalized,
      lemmaKey: normalizeLemmaKey(lemma),
      vocabulary: e,
    });
    if (pool.length >= 40) break;
  }
  return pool.filter(rowUsableForQuestion);
}
