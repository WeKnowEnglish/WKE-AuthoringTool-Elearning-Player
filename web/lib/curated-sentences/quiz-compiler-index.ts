/**
 * Link sentence-bank rows to master vocabulary lemmas (surface-form aliases).
 */

import type { VocabularyEntry } from "./master-vocabulary";
import { normalizeLemmaKey, normalizeSentenceRow } from "./quiz-compiler-loader";
import type { IndexedSentenceRow, NormalizedSentenceRow, SentenceBankCsvRow } from "./quiz-compiler-types";

export { normalizeLemmaKey };

/** Map normalized lemma / surface form -> vocabulary entry (first wins on conflict). */
export function buildLemmaAliasMap(entries: VocabularyEntry[]): Map<string, VocabularyEntry> {
  const map = new Map<string, VocabularyEntry>();

  function addAlias(key: string, entry: VocabularyEntry) {
    const k = normalizeLemmaKey(key);
    if (!k) return;
    if (!map.has(k)) map.set(k, entry);
  }

  for (const e of entries) {
    addAlias(e.id, e);
    addAlias(e.lemma, e);
    const f = e.forms;
    if (f.base) addAlias(f.base, e);
    if (f.plural) addAlias(f.plural, e);
    if (f.third_person) addAlias(f.third_person, e);
    if (f.past) addAlias(f.past, e);
    if (f.past_participle) addAlias(f.past_participle, e);
    if (f.present_participle) addAlias(f.present_participle, e);
    if (f.comparative) addAlias(f.comparative, e);
    if (f.superlative) addAlias(f.superlative, e);
    for (const a of e.acceptable_typed_answers ?? []) addAlias(a, e);
  }

  return map;
}

export function indexSentenceRows(
  rows: NormalizedSentenceRow[],
  lemmaMap: Map<string, VocabularyEntry>,
): IndexedSentenceRow[] {
  return rows.map((r) => {
    const key = r.target_word ? normalizeLemmaKey(r.target_word) : "";
    const vocabulary = key ? lemmaMap.get(key) ?? null : null;
    return {
      ...r,
      lemmaKey: key,
      vocabulary,
    };
  });
}

/** Load JSON rows (from `sentence-bank.generated.json`) and normalize. */
export function normalizeJsonRows(json: SentenceBankCsvRow[]): NormalizedSentenceRow[] {
  return json.map((raw, i) => normalizeSentenceRow(raw, i));
}
