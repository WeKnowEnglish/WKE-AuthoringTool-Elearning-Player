/**
 * Writes CSV of every eligible row per menu topic and question type (MC, fill, letter mix-up).
 * Excludes distractor / shuffle variants.
 *
 * Run from `web/`: `npm run snapshot:quiz-eligibility`
 * Output: `web/quiz-eligibility-snapshot.csv`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "csv-stringify/sync";
import { getQuizEligibilitySnapshotRecords } from "../lib/teststartpage/quiz-eligibility-snapshot";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const outPath = path.join(webRoot, "quiz-eligibility-snapshot.csv");

function main() {
  const records = getQuizEligibilitySnapshotRecords();
  const header = [
    "topic",
    "question_type",
    "bank_row_index",
    "row_identity",
    "target_word",
    "sentence",
    "structure_id",
    "tags",
    "cefr",
    "difficulty",
    "variant_group",
    "lemma_key",
    "source",
  ] as const;

  const csv = stringify(records, {
    header: true,
    columns: [...header],
    quoted_string: true,
  });

  fs.writeFileSync(outPath, csv, "utf8");
  console.log(`Wrote ${records.length} rows to ${outPath}`);
}

main();
