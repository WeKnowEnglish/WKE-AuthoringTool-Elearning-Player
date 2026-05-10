import { describe, expect, it } from "vitest";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import {
  buildFillBlanksPayload,
  buildLetterMixupPayload,
  buildMcQuizPayload,
} from "./quiz-compiler-builders";
import { menuTopicVocabSet } from "./core-topic-clusters";
import {
  filterByTier,
  pickCandidatesWithFallback,
  rowMatchesTopic,
  rowUsableForQuestion,
} from "./quiz-compiler-filters";
import { buildLemmaAliasMap, indexSentenceRows, normalizeJsonRows } from "./quiz-compiler-index";
import { parseSentenceBankCsv, validateNormalizedRows } from "./quiz-compiler-loader";
import { buildSyntheticLetterMixupIndexedRows, runQuizCompiler } from "./quiz-compiler";
import {
  normalizeRowSentenceKey,
  pickRowsDifficultyWeighted,
  rowIdentity,
  varietySetsFromRows,
} from "./quiz-compiler-pick";
import { MASTER_VOCABULARY } from "./master-vocabulary";
import { SENTENCE_BANK_ROWS_RAW } from "./sentence-bank-data";
import { TOPICS } from "@/lib/teststartpage/bank";
import type { IndexedSentenceRow, SentenceBankCsvRow } from "./quiz-compiler-types";
import { STUDENT_MENU_TOPIC_IDS } from "./quiz-compiler-types";

function loadIndexed(): IndexedSentenceRow[] {
  const normalized = normalizeJsonRows(SENTENCE_BANK_ROWS_RAW);
  return indexSentenceRows(normalized, buildLemmaAliasMap(MASTER_VOCABULARY.entries));
}

describe("letter_mixup coverage (all menu topics)", () => {
  it("has a non-empty vocabulary spelling pool for every topic", () => {
    for (const topic of STUDENT_MENU_TOPIC_IDS) {
      const synth = buildSyntheticLetterMixupIndexedRows(topic, MASTER_VOCABULARY.entries);
      expect(synth.length).toBeGreaterThan(0);
    }
  });

  it.each(STUDENT_MENU_TOPIC_IDS)(
    "builds at least one letter_mixup slide for %s (6-question quiz)",
    (topic) => {
      const { questions } = runQuizCompiler(topic, `all-topics-letter:${topic}`, undefined, {
        questionCount: 6,
        difficultyLevel: 2,
      });
      const letters = questions.filter((q) => q.subtype === "letter_mixup");
      expect(letters.length).toBeGreaterThanOrEqual(1);
      for (const q of letters) {
        expect(q.items?.[0]?.target_word?.length).toBeGreaterThanOrEqual(3);
      }
    },
  );
});

describe("runQuizCompiler", () => {
  for (const { id: topic } of TOPICS) {
    it(`produces valid mc_quiz, fill_blanks, letter_mixup for ${topic}`, () => {
      const { questions, debug } = runQuizCompiler(topic, `vitest-fixed-seed:${topic}`);
      expect(questions).toHaveLength(3);
      expect(debug.candidateCount).toBeGreaterThan(0);
      expect(questions[0].subtype).toBe("mc_quiz");
      expect(questions[1].subtype).toBe("fill_blanks");
      expect(questions[2].subtype).toBe("letter_mixup");

      for (const q of questions) {
        const again = parseScreenPayload("interaction", q);
        expect(again).toBeTruthy();
        expect(again?.type).toBe("interaction");
      }
    });
  }

  it("supports 10 questions with difficulty 3 and cycles subtypes", () => {
    const { questions, debug } = runQuizCompiler("school", "vitest-long-quiz", undefined, {
      questionCount: 10,
      difficultyLevel: 3,
    });
    expect(questions).toHaveLength(10);
    expect(debug.quizQuestionCount).toBe(10);
    expect(debug.quizDifficultyLevel).toBe(3);
    const expected = ["mc_quiz", "fill_blanks", "letter_mixup", "mc_quiz", "fill_blanks", "letter_mixup", "mc_quiz", "fill_blanks", "letter_mixup", "mc_quiz"] as const;
    for (let i = 0; i < 10; i += 1) {
      expect(questions[i].subtype).toBe(expected[i]);
      const again = parseScreenPayload("interaction", questions[i]);
      expect(again?.type).toBe("interaction");
    }
  });
});

describe("pickRowsDifficultyWeighted", () => {
  function makeRow(
    partial: Partial<IndexedSentenceRow> & Pick<IndexedSentenceRow, "sentence" | "target_word" | "rowIndex">,
  ): IndexedSentenceRow {
    return {
      acceptable_targets: [],
      variant_lexemes: [],
      structure_id: "test",
      tags: [],
      cefr: "a1",
      difficulty: 1,
      variant_group: "",
      lemmaKey: partial.target_word.toLowerCase(),
      vocabulary: null,
      ...partial,
    };
  }

  it("never reuses the same row identity when padding a shortfall (no duplicate tail)", () => {
    const a = makeRow({ rowIndex: 1, sentence: "One.", target_word: "one" });
    const b = makeRow({ rowIndex: 2, sentence: "Two.", target_word: "two" });
    const out = pickRowsDifficultyWeighted([a, b], 5, 2, "seed-pad-tail", { dedupeSentenceAndLemma: false });
    const ids = out.map(rowIdentity);
    expect(new Set(ids).size).toBe(ids.length);
    expect(out.length).toBe(2);
  });

  it("skips second row that shares the same sentence when variety is strict", () => {
    const a = makeRow({ rowIndex: 1, sentence: "Same line.", target_word: "one" });
    const b = makeRow({ rowIndex: 2, sentence: "Same line.", target_word: "two" });
    const out = pickRowsDifficultyWeighted([a, b], 2, 2, "seed-dup-sent");
    expect(out).toHaveLength(1);
  });

  it("honors variety seeds so text picks avoid letter sentence and target", () => {
    const letter = makeRow({ rowIndex: 0, sentence: "The sun is bright.", target_word: "sun" });
    const sameSentence = makeRow({ rowIndex: 1, sentence: "The sun is bright.", target_word: "bright" });
    const other = makeRow({ rowIndex: 2, sentence: "I like soup.", target_word: "soup" });
    const out = pickRowsDifficultyWeighted([sameSentence, other], 2, 2, "seed-seeds", {
      varietySeeds: varietySetsFromRows([letter]),
    });
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.some((r) => r.rowIndex === 2)).toBe(true);
    expect(out.every((r) => normalizeRowSentenceKey(r) !== normalizeRowSentenceKey(letter))).toBe(true);
    expect(out.every((r) => r.target_word.toLowerCase() !== "sun")).toBe(true);
  });

  it("allows at most one row per variant_group when variety is strict", () => {
    const g = "vg_unit_test";
    const a = makeRow({
      rowIndex: 1,
      sentence: "This is our breakfast.",
      target_word: "breakfast",
      variant_group: g,
      lemmaKey: "breakfast",
    });
    const b = makeRow({
      rowIndex: 2,
      sentence: "This is our lunch.",
      target_word: "lunch",
      variant_group: g,
      lemmaKey: "lunch",
    });
    const c = makeRow({ rowIndex: 3, sentence: "Other line here.", target_word: "other", variant_group: "" });
    const out = pickRowsDifficultyWeighted([a, b, c], 3, 2, "seed-variant-group");
    const nonEmptyGroups = out.map((r) => r.variant_group).filter((x) => String(x).trim().length > 0);
    expect(new Set(nonEmptyGroups).size).toBe(nonEmptyGroups.length);
  });
});

describe("menu topic polish (animals + actions)", () => {
  it("animals cluster uses animals slug only, not nature", () => {
    expect(menuTopicVocabSet("animals").has("nature")).toBe(false);
    expect(menuTopicVocabSet("animals").has("animals")).toBe(true);
  });

  it("nature-only lemma rows are excluded from animals menu topic", () => {
    const tree = MASTER_VOCABULARY.entries.find((e) => e.lemma === "tree")!;
    expect(tree.topics).toContain("nature");
    expect(tree.topics.includes("animals")).toBe(false);
    const row: IndexedSentenceRow = {
      sentence: "I see one tree.",
      target_word: "tree",
      acceptable_targets: [],
      variant_lexemes: [],
      structure_id: "existential_there",
      tags: [],
      cefr: "a1",
      difficulty: 1,
      rowIndex: 42_001,
      variant_group: "",
      lemmaKey: "tree",
      vocabulary: tree,
    };
    expect(rowMatchesTopic(row, "animals")).toBe(false);
  });

  it("be_adjective state rows are excluded from actions when not verb/cluster matched", () => {
    const row: IndexedSentenceRow = {
      sentence: "He is cold.",
      target_word: "cold",
      acceptable_targets: [],
      variant_lexemes: [],
      structure_id: "be_adjective",
      tags: ["be", "adjective", "state"],
      cefr: "a1",
      difficulty: 1,
      rowIndex: 42_002,
      variant_group: "",
      lemmaKey: "cold",
      vocabulary: null,
    };
    expect(rowMatchesTopic(row, "actions")).toBe(false);
  });
});

describe("pickCandidatesWithFallback", () => {
  it("returns a tier and non-empty pool for each menu topic", () => {
    const indexed = loadIndexed();
    for (const { id: topic } of TOPICS) {
      const { rows, tier } = pickCandidatesWithFallback(indexed, topic, MASTER_VOCABULARY.entries);
      expect(rows.length).toBeGreaterThan(0);
      expect(tier).toBeTruthy();
    }
  });

  it("strict tier is a subset of topic_only pool for food", () => {
    const indexed = loadIndexed();
    const strict = filterByTier(indexed, "food", "strict");
    const loose = filterByTier(indexed, "food", "topic_only");
    expect(strict.length).toBeLessThanOrEqual(loose.length);
  });

  it("matches a menu topic via tag hints when vocabulary is not linked", () => {
    const row: IndexedSentenceRow = {
      sentence: "We draw a map of the zoo.",
      target_word: "zoo",
      acceptable_targets: [],
      variant_lexemes: [],
      structure_id: "narrative",
      tags: ["zoo", "map"],
      cefr: "a1",
      difficulty: 1,
      rowIndex: 999_001,
      variant_group: "",
      lemmaKey: "zoo",
      vocabulary: null,
    };
    expect(rowMatchesTopic(row, "animals")).toBe(true);
    expect(rowMatchesTopic(row, "food")).toBe(false);
  });
});

describe("quiz-compiler-loader", () => {
  it("parseSentenceBankCsv reads header and rows", () => {
    const csv = [
      "sentence,target_word,acceptable_targets,variant_lexemes,structure_id,tags,cefr,difficulty",
      '"Hello there, teacher.","Hello",,hello,greetings,greeting|school,a1,1',
    ].join("\n");
    const rows = parseSentenceBankCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].target_word).toBe("Hello");
    expect(rows[0].cefr).toBe("a1");
    expect(rows[0].variant_group).toBe("");
  });

  it("parseSentenceBankCsv reads optional variant_group column", () => {
    const csv = [
      "sentence,target_word,acceptable_targets,variant_lexemes,structure_id,tags,cefr,difficulty,variant_group",
      "Hi,hi,,,test,t,a1,1,vg_x",
    ].join("\n");
    const rows = parseSentenceBankCsv(csv);
    expect(rows[0]?.variant_group).toBe("vg_x");
  });

  it("validateNormalizedRows flags invalid cefr when other metadata present", () => {
    const issues = validateNormalizedRows([
      {
        sentence: "Test",
        target_word: "x",
        acceptable_targets: [],
        variant_lexemes: [],
        structure_id: "s",
        tags: [],
        cefr: null,
        difficulty: null,
        variant_group: "",
        rowIndex: 0,
      },
    ]);
    expect(issues.some((i) => i.message.includes("cefr"))).toBe(true);
  });
});

describe("payload builders + parseScreenPayload", () => {
  const bookEntry = MASTER_VOCABULARY.entries.find((e) => e.lemma === "book")!;
  const sampleRow: IndexedSentenceRow = {
    sentence: "I read a book every day.",
    target_word: "book",
    acceptable_targets: ["Book"],
    variant_lexemes: ["books"],
    structure_id: "daily_routines",
    tags: ["school"],
    cefr: "a1",
    difficulty: 1,
    rowIndex: 0,
    variant_group: "",
    lemmaKey: "book",
    vocabulary: bookEntry,
  };

  it("buildMcQuizPayload validates", () => {
    const raw = buildMcQuizPayload(sampleRow, "school", MASTER_VOCABULARY.entries, "t1");
    const p = parseScreenPayload("interaction", raw);
    expect(p?.type).toBe("interaction");
    if (p?.type === "interaction" && p.subtype === "mc_quiz") {
      expect(p.options).toHaveLength(4);
      expect(["a", "b", "c", "d"]).toContain(p.correct_option_id);
    }
  });

  it("buildFillBlanksPayload validates", () => {
    const raw = buildFillBlanksPayload(sampleRow, "school", MASTER_VOCABULARY.entries, "t1");
    const p = parseScreenPayload("interaction", raw);
    expect(p?.type).toBe("interaction");
    if (p?.type === "interaction" && p.subtype === "fill_blanks") {
      expect(p.template).toContain("__1__");
      expect(p.blanks?.[0]?.acceptable?.length).toBeGreaterThan(0);
      expect(p.word_bank).toHaveLength(4);
      expect(p.word_bank).toContain("book");
    }
  });

  it("buildLetterMixupPayload validates", () => {
    const raw = buildLetterMixupPayload(sampleRow);
    const p = parseScreenPayload("interaction", raw);
    expect(p?.type).toBe("interaction");
    if (p?.type === "interaction" && p.subtype === "letter_mixup") {
      expect(p.items?.[0]?.target_word).toBeTruthy();
    }
  });
});

describe("variant_lexemes expansion (materialized rows)", () => {
  const breakfastRow: SentenceBankCsvRow = {
    sentence: "This is our breakfast.",
    target_word: "breakfast",
    acceptable_targets: "",
    variant_lexemes: "lunch",
    structure_id: "be_a_noun",
    tags: "be|demonstrative_this|possessive_our|singular|food",
    cefr: "a1",
    difficulty: "2",
    variant_group: "vg_test_expand",
  };

  it("expanded breakfast row matches food topic, is usable, and builds MCQ", () => {
    const normalized = normalizeJsonRows([breakfastRow]);
    const indexed = indexSentenceRows(normalized, buildLemmaAliasMap(MASTER_VOCABULARY.entries));
    const row = indexed[0]!;
    expect(rowMatchesTopic(row, "food")).toBe(true);
    expect(rowUsableForQuestion(row)).toBe(true);
    const raw = buildMcQuizPayload(row, "food", MASTER_VOCABULARY.entries, "expand-test");
    expect(parseScreenPayload("interaction", raw)?.type).toBe("interaction");
  });
});

describe("sentence-bank JSON", () => {
  it("embedded rows match SentenceBankCsvRow shape", () => {
    const row = SENTENCE_BANK_ROWS_RAW[0] as SentenceBankCsvRow;
    expect(row.sentence).toBeDefined();
    expect(row.target_word).toBeDefined();
  });

  /** Guards against a regression where embed-a1-sentence-bank.mjs emitted the CSV header
   *  as a phantom data row (e.g. `{sentence: "sentence", target_word: "target_word", ...}`). */
  it("does not include the literal CSV header as a data row", () => {
    for (const row of SENTENCE_BANK_ROWS_RAW) {
      expect(row.sentence).not.toBe("sentence");
      expect(row.target_word).not.toBe("target_word");
      expect(row.structure_id).not.toBe("structure_id");
    }
  });

  /** Catches stale-JSON regressions: the bank should always be the full A1 corpus. */
  it("contains the full A1 sentence bank (>= 500 rows)", () => {
    expect(SENTENCE_BANK_ROWS_RAW.length).toBeGreaterThanOrEqual(500);
  });

  /** Most rows should be fully annotated; a tiny tail of fixed-phrase rows
   *  (e.g. greetings) may legitimately have an empty target_word. */
  it("at least 95% of rows have a non-empty target_word", () => {
    const filled = SENTENCE_BANK_ROWS_RAW.filter((r) => String(r.target_word ?? "").trim().length > 0);
    const ratio = filled.length / SENTENCE_BANK_ROWS_RAW.length;
    expect(ratio).toBeGreaterThanOrEqual(0.95);
  });
});
