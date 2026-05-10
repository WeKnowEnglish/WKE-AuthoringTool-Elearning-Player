/**
 * Parse and normalize A1 sentence-bank CSV rows.
 */

import type { Cefr, Difficulty } from "./master-vocabulary";
import type { NormalizedSentenceRow, SentenceBankCsvRow } from "./quiz-compiler-types";

const CEFR_SET = new Set<Cefr>(["pre_a1", "a1", "a2", "b1", "b2", "c1"]);

function parseCefr(raw: string): Cefr | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (CEFR_SET.has(t as Cefr)) return t as Cefr;
  return null;
}

function parseDifficulty(raw: string): Difficulty | null {
  const t = raw.trim();
  if (t === "1" || t === "2" || t === "3") return Number(t) as Difficulty;
  return null;
}

/** Split `a;b;c` or empty -> tokens (trimmed, drop empty). */
export function splitSemicolonList(s: string): string[] {
  if (!s || !String(s).trim()) return [];
  return String(s)
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Sentence bank uses `|` for tags, e.g. `wh_question|how|greeting`. */
export function splitPipeList(s: string): string[] {
  if (!s || !String(s).trim()) return [];
  return String(s)
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Acceptable targets sometimes comma-separated (e.g. `soccer,football`). */
export function splitAcceptableTargets(s: string): string[] {
  if (!s || !String(s).trim()) return [];
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function normalizeLemmaKey(s: string): string {
  return s.trim().toLowerCase();
}

export function normalizeSentenceRow(raw: SentenceBankCsvRow, rowIndex: number): NormalizedSentenceRow {
  return {
    sentence: String(raw.sentence ?? "").trim(),
    target_word: String(raw.target_word ?? "").trim(),
    acceptable_targets: splitAcceptableTargets(String(raw.acceptable_targets ?? "")),
    variant_lexemes: splitSemicolonList(String(raw.variant_lexemes ?? "")),
    structure_id: String(raw.structure_id ?? "").trim(),
    tags: splitPipeList(String(raw.tags ?? "")),
    cefr: parseCefr(String(raw.cefr ?? "")),
    difficulty: parseDifficulty(String(raw.difficulty ?? "")),
    variant_group: String(raw.variant_group ?? "").trim(),
    rowIndex,
  };
}

/**
 * Parse full CSV text (header row required). Used in tests and optional tooling.
 */
export function parseSentenceBankCsv(csvText: string): NormalizedSentenceRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const out: NormalizedSentenceRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length === 0 || !String(cells[0] ?? "").trim()) continue;
    const row: SentenceBankCsvRow = {
      sentence: cells[0] ?? "",
      target_word: cells[1] ?? "",
      acceptable_targets: cells[2] ?? "",
      variant_lexemes: cells[3] ?? "",
      structure_id: cells[4] ?? "",
      tags: cells[5] ?? "",
      cefr: cells[6] ?? "",
      difficulty: cells[7] ?? "",
      variant_group: cells[8] ?? "",
    };
    out.push(normalizeSentenceRow(row, i - 1));
  }
  return out;
}

/** Minimal CSV line parser (handles quoted fields, commas inside quotes). */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export type RowValidationIssue = {
  rowIndex: number;
  message: string;
};

export function validateNormalizedRows(rows: NormalizedSentenceRow[]): RowValidationIssue[] {
  const issues: RowValidationIssue[] = [];
  for (const r of rows) {
    if (!r.sentence) {
      issues.push({ rowIndex: r.rowIndex, message: "Empty sentence" });
      continue;
    }
    const hasMeta =
      !!r.target_word ||
      !!r.structure_id ||
      r.tags.length > 0 ||
      r.variant_lexemes.length > 0 ||
      r.acceptable_targets.length > 0;
    if (hasMeta && r.cefr === null) {
      issues.push({ rowIndex: r.rowIndex, message: "Missing or invalid cefr while other metadata present" });
    }
    if (r.difficulty === null && r.cefr !== null) {
      issues.push({ rowIndex: r.rowIndex, message: "Missing or invalid difficulty" });
    }
  }
  return issues;
}
