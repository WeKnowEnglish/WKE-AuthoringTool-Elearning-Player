/**
 * Reads repo-root `A1 Sentence Bank.csv` and writes
 * `web/lib/curated-sentences/sentence-bank.generated.json` for bundling.
 *
 * Run from repo: node web/scripts/embed-a1-sentence-bank.mjs
 *
 * After expanding variant rows (`npm run expand:sentence-variants -- …`), run
 * this script so the app bundles the updated bank.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const csvPath = path.join(repoRoot, "A1 Sentence Bank.csv");
const outPath = path.join(repoRoot, "web/lib/curated-sentences/sentence-bank.generated.json");

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

function main() {
  const raw = fs.readFileSync(csvPath, "utf8");
  /** `from_line: 2` skips the literal header row so it isn't bundled as a phantom data row. */
  const rows = parse(raw, {
    columns: HEADER,
    from_line: 2,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const out = rows
    .filter((r) => r.sentence && String(r.sentence).trim())
    .map((r) => ({
      sentence: String(r.sentence ?? ""),
      target_word: String(r.target_word ?? ""),
      acceptable_targets: String(r.acceptable_targets ?? ""),
      variant_lexemes: String(r.variant_lexemes ?? ""),
      structure_id: String(r.structure_id ?? ""),
      tags: String(r.tags ?? ""),
      cefr: String(r.cefr ?? ""),
      difficulty: String(r.difficulty ?? ""),
      variant_group: String(r.variant_group ?? ""),
    }));

  if (out.length > 0 && out[0].sentence === "sentence") {
    throw new Error("First row looks like the CSV header — adjust from_line.");
  }

  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 0)}\n`, "utf8");
  console.log(`Wrote ${outPath} (${out.length} rows)`);
}

main();
