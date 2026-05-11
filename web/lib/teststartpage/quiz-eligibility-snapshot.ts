/**
 * Enumerates every sentence-bank / synthetic row that can appear as each interaction
 * subtype on /teststartpage for the six menu topics (no distractor expansion).
 */

import {
  buildSyntheticLetterMixupIndexedRows,
  getIndexedRowsForQuizCompiler,
} from "@/lib/curated-sentences/quiz-compiler";
import { rowUsableForLetterMixup } from "@/lib/curated-sentences/quiz-compiler-builders";
import { rowMatchesTopic, rowUsableForQuestion } from "@/lib/curated-sentences/quiz-compiler-filters";
import { rowIdentity } from "@/lib/curated-sentences/quiz-compiler-pick";
import type { IndexedSentenceRow } from "@/lib/curated-sentences/quiz-compiler-types";
import { STUDENT_MENU_TOPIC_IDS } from "@/lib/curated-sentences/quiz-compiler-types";
import { MASTER_VOCABULARY } from "@/lib/curated-sentences/master-vocabulary";

export type QuizEligibilityQuestionType = "mc_quiz" | "fill_blanks" | "letter_mixup";

export type QuizEligibilitySnapshotRow = {
  topic: string;
  question_type: QuizEligibilityQuestionType;
  /** Original CSV 0-based data row index, or synthetic row index (negative). */
  bank_row_index: number;
  row_identity: string;
  target_word: string;
  sentence: string;
  structure_id: string;
  tags: string;
  cefr: string;
  difficulty: string;
  variant_group: string;
  lemma_key: string;
  source: "sentence_bank" | "synthetic_vocab_letter";
};

function rowToSnapshotBase(
  topic: string,
  question_type: QuizEligibilityQuestionType,
  row: IndexedSentenceRow,
  source: QuizEligibilitySnapshotRow["source"],
): QuizEligibilitySnapshotRow {
  return {
    topic,
    question_type,
    bank_row_index: row.rowIndex,
    /** `rowIndex | lemmaKey | target_word` (same components as compiler `rowIdentity`, without NULs). */
  row_identity: rowIdentity(row).split("\0").join(" | "),
    target_word: row.target_word,
    sentence: row.sentence,
    structure_id: row.structure_id,
    tags: row.tags.join("|"),
    cefr: row.cefr ?? "",
    difficulty: row.difficulty != null ? String(row.difficulty) : "",
    variant_group: row.variant_group ?? "",
    lemma_key: row.lemmaKey,
    source,
  };
}

/**
 * All variants the compiler could use for MCQ/fill (on-topic + target appears in sentence).
 * Same row is listed once per subtype because slots are distinct in the quiz pattern.
 */
export function getQuizEligibilitySnapshotRecords(): QuizEligibilitySnapshotRow[] {
  const indexed = getIndexedRowsForQuizCompiler();
  const out: QuizEligibilitySnapshotRow[] = [];

  for (const topic of STUDENT_MENU_TOPIC_IDS) {
    const mcFillRows = indexed.filter((r) => rowMatchesTopic(r, topic) && rowUsableForQuestion(r));
    for (const r of mcFillRows) {
      out.push(rowToSnapshotBase(topic, "mc_quiz", r, "sentence_bank"));
      out.push(rowToSnapshotBase(topic, "fill_blanks", r, "sentence_bank"));
    }

    const letterFromBank = indexed.filter(
      (r) => rowMatchesTopic(r, topic) && rowUsableForLetterMixup(r),
    );
    const synthetic = buildSyntheticLetterMixupIndexedRows(topic, MASTER_VOCABULARY.entries);
    const letterSeen = new Set<string>();
    for (const r of [...letterFromBank, ...synthetic]) {
      const id = rowIdentity(r);
      if (letterSeen.has(id)) continue;
      letterSeen.add(id);
      out.push(
        rowToSnapshotBase(
          topic,
          "letter_mixup",
          r,
          r.rowIndex < 0 ? "synthetic_vocab_letter" : "sentence_bank",
        ),
      );
    }
  }

  return out;
}
