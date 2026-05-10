/**
 * Expand `variant_lexemes` into concrete CSV rows (one per sibling lemma).
 *
 * Workflow (after editing the bank):
 *   1. npm run expand:sentence-variants -- --structure be_a_noun --tag-includes food
 *   2. npm run generate:sentence-bank
 *   3. npm test -- quiz-compiler
 *
 * Safety: requires `--structure <id>` (repeatable) or `--all-structures`.
 * Use `--dry-run` to print actions without writing.
 *
 * Paths: CSV_READ_PATH / CSV_WRITE_PATH default to repo-root `A1 Sentence Bank.csv`.
 * Master vocab: `web/lib/curated-sentences/master-vocabulary.ts` (lemma → forms.base).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import { parseMasterVocabLemmaToBase } from "./lib/parse-master-vocab-bases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const defaultCsv = path.join(repoRoot, "A1 Sentence Bank.csv");
const csvReadPath = process.env.CSV_READ_PATH ?? defaultCsv;
const csvWritePath = process.env.CSV_WRITE_PATH ?? defaultCsv;
const masterVocabPath = path.join(
  repoRoot,
  "web/lib/curated-sentences/master-vocabulary.ts",
);

const HEADER = [
  "sentence",
  "target_word",
  "acceptable_targets",
  "variant_lexemes",
  "structure_id",
  "tags",
  "cefr",
  "difficulty",
  "variant_group",
];

function normalizeLemmaKey(s) {
  return String(s ?? "").trim().toLowerCase();
}

function splitSemicolonList(s) {
  if (!s || !String(s).trim()) return [];
  return String(s)
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitPipeList(s) {
  if (!s || !String(s).trim()) return [];
  return String(s)
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Same idea as findTargetSurface in quiz-compiler-builders.ts */
function findTargetSurface(sentence, target) {
  if (!target || !sentence) return null;
  const lower = sentence.toLowerCase();
  const t = target.toLowerCase();
  const idx = lower.indexOf(t);
  if (idx < 0) return null;
  return { start: idx, surface: sentence.slice(idx, idx + target.length) };
}

function applyCasing(matchedSurface, replacement) {
  if (!matchedSurface.length) return replacement;
  const first = matchedSurface[0];
  const refUpper = first === first.toUpperCase() && first !== first.toLowerCase();
  if (refUpper) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement.charAt(0).toLowerCase() + replacement.slice(1);
}

function normalizeSentenceKey(sentence) {
  return String(sentence).trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeKey(sentence, targetWord) {
  return `${normalizeSentenceKey(sentence)}\0${normalizeLemmaKey(targetWord)}`;
}

function stableVariantGroupId(structureId, origSentence, siblingLemmaKeysSorted) {
  const h = crypto
    .createHash("sha256")
    .update(
      `${structureId}\0${normalizeSentenceKey(origSentence)}\0${siblingLemmaKeysSorted.join(";")}`,
      "utf8",
    )
    .digest("hex")
    .slice(0, 16);
  return `vg_${h}`;
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const allStructures = argv.includes("--all-structures");
  const structures = [];
  const tagIncludes = [];
  for (const a of argv) {
    if (a.startsWith("--structure=")) structures.push(a.slice("--structure=".length));
    if (a.startsWith("--tag-includes=")) tagIncludes.push(a.slice("--tag-includes=".length));
  }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--structure" && argv[i + 1]) structures.push(argv[i + 1]);
    if (argv[i] === "--tag-includes" && argv[i + 1]) tagIncludes.push(argv[i + 1]);
  }
  return { dryRun, allStructures, structures, tagIncludes };
}

function rowToCells(row) {
  return HEADER.map((h) => String(row[h] ?? ""));
}

function cellsToObject(cells) {
  const pad = cells.slice();
  while (pad.length < HEADER.length) pad.push("");
  const o = {};
  for (let i = 0; i < HEADER.length; i += 1) {
    o[HEADER[i]] = pad[i] ?? "";
  }
  return o;
}

function eligibleForExpansion(row, structuresSet, allStructures, tagIncludes) {
  if (String(row.variant_group ?? "").trim()) return false;

  const variants = splitSemicolonList(row.variant_lexemes);
  if (variants.length === 0) return false;

  const sid = String(row.structure_id ?? "").trim();
  if (!allStructures) {
    if (!structuresSet.has(sid)) return false;
  }

  if (tagIncludes.length > 0) {
    const tags = new Set(splitPipeList(row.tags).map((t) => t.toLowerCase()));
    for (const t of tagIncludes) {
      if (!tags.has(String(t).trim().toLowerCase())) return false;
    }
  }
  return true;
}

function expandOneRow(row, lemmaToBase, warnings) {
  const sentence = String(row.sentence ?? "").trim();
  const targetWord = String(row.target_word ?? "").trim();
  const found = findTargetSurface(sentence, targetWord);
  if (!found) {
    warnings.push(`skip: target not in sentence (row): ${sentence.slice(0, 48)}…`);
    return null;
  }

  const variantLemmas = splitSemicolonList(row.variant_lexemes);
  const siblingKeys = [];
  const seen = new Set();
  for (const lemma of [targetWord, ...variantLemmas]) {
    const k = normalizeLemmaKey(lemma);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    siblingKeys.push(k);
  }

  const surfaces = new Map();
  for (const k of siblingKeys) {
    const base = lemmaToBase.get(k);
    if (base == null) {
      warnings.push(`skip sibling (no vocab): "${k}" in "${sentence.slice(0, 40)}…"`);
      continue;
    }
    surfaces.set(k, base);
  }
  const emittedKeys = siblingKeys.filter((k) => surfaces.has(k));
  if (emittedKeys.length < 2) {
    warnings.push(
      `skip: fewer than 2 siblings with vocab (${emittedKeys.length}) for: ${sentence.slice(0, 48)}`,
    );
    return null;
  }

  const groupId = stableVariantGroupId(
    String(row.structure_id ?? "").trim(),
    sentence,
    [...siblingKeys].sort(),
  );

  const outRows = [];
  for (const lemmaKey of emittedKeys) {
    const newBase = surfaces.get(lemmaKey);
    if (newBase == null) continue;

    const newSurface = applyCasing(found.surface, newBase);
    const newSentence =
      sentence.slice(0, found.start) + newSurface + sentence.slice(found.start + found.surface.length);

    if (!newSentence.toLowerCase().includes(newSurface.toLowerCase())) {
      warnings.push(`skip: substitution broke includes check for lemma ${lemmaKey}`);
      continue;
    }

    const otherLemmas = emittedKeys.filter((k) => k !== lemmaKey);
    const variantLexemesStr = otherLemmas.join(";");

    outRows.push({
      sentence: newSentence,
      target_word: newSurface,
      acceptable_targets: String(row.acceptable_targets ?? ""),
      variant_lexemes: variantLexemesStr,
      structure_id: String(row.structure_id ?? ""),
      tags: String(row.tags ?? ""),
      cefr: String(row.cefr ?? ""),
      difficulty: String(row.difficulty ?? ""),
      variant_group: groupId,
    });
  }

  if (outRows.length < 2) {
    warnings.push(`skip: emitted < 2 rows for: ${sentence.slice(0, 48)}`);
    return null;
  }
  return outRows;
}

function main() {
  const { dryRun, allStructures, structures, tagIncludes } = parseArgs(process.argv.slice(2));

  if (!allStructures && structures.length === 0) {
    console.error(
      "Refusing to run without scope: pass --structure <structure_id> (repeatable) or --all-structures.",
    );
    process.exit(1);
  }

  const structuresSet = new Set(structures);
  const lemmaToBase = parseMasterVocabLemmaToBase(masterVocabPath);

  const raw = fs.readFileSync(csvReadPath, "utf8");
  const matrix = parse(raw, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  if (matrix.length === 0) {
    throw new Error(`Empty CSV: ${csvReadPath}`);
  }

  const dataRows = matrix.slice(1).filter((r) => r.length && String(r[0] ?? "").trim());

  /** Multiset of sentence+target keys already present in the bank (updated as we emit). */
  const keyCounts = new Map();
  for (const cells of dataRows) {
    const o = cellsToObject(cells);
    if (!String(o.sentence ?? "").trim()) continue;
    const k = dedupeKey(o.sentence, o.target_word);
    keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }

  const out = [HEADER];
  const warnings = [];
  let expanded = 0;
  let skippedDupes = 0;

  for (const cells of dataRows) {
    const row = cellsToObject(cells);
    if (!eligibleForExpansion(row, structuresSet, allStructures, tagIncludes)) {
      out.push(HEADER.map((h) => String(row[h] ?? "")));
      continue;
    }

    const expandedBlock = expandOneRow(row, lemmaToBase, warnings);
    if (!expandedBlock) {
      out.push(HEADER.map((h) => String(row[h] ?? "")));
      continue;
    }

    const srcKey = dedupeKey(row.sentence, row.target_word);
    keyCounts.set(srcKey, (keyCounts.get(srcKey) ?? 1) - 1);

    const accepted = [];
    for (const er of expandedBlock) {
      const k = dedupeKey(er.sentence, er.target_word);
      if ((keyCounts.get(k) ?? 0) > 0) {
        skippedDupes += 1;
        warnings.push(`skip duplicate: "${er.sentence.slice(0, 50)}" / ${er.target_word}`);
        continue;
      }
      keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
      accepted.push(er);
    }

    if (accepted.length < 2) {
      warnings.push(`skip expansion (dedupe left < 2 rows): ${row.sentence.slice(0, 48)}`);
      keyCounts.set(srcKey, (keyCounts.get(srcKey) ?? 0) + 1);
      for (const er of accepted) {
        const k = dedupeKey(er.sentence, er.target_word);
        keyCounts.set(k, (keyCounts.get(k) ?? 1) - 1);
      }
      out.push(HEADER.map((h) => String(row[h] ?? "")));
      continue;
    }

    for (const er of accepted) {
      out.push(rowToCells(er));
    }
    expanded += 1;
  }

  for (const w of warnings) console.warn(w);
  console.log(`Expanded ${expanded} source row(s); skipped ${skippedDupes} duplicate emission(s).`);

  if (dryRun) {
    console.log("[dry-run] not writing");
    return;
  }

  const csvOut = stringify(out, { header: false });
  fs.writeFileSync(csvWritePath, csvOut, "utf8");
  console.log(`Wrote ${csvWritePath} (${out.length - 1} data rows)`);
}

main();
