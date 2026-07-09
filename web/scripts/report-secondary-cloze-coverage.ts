import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSecondaryClozeCoverageReport,
  classifySecondaryClozeTier,
  formatSecondaryClozeCoverageReport,
  SECONDARY_CLOZE_TIER_AB_MIN_PERCENT,
} from "../lib/secondary/secondary-cloze-coverage.ts";
import { getCompleteSecondaryVocabPack } from "../lib/secondary/secondary-vocab-pack-loader.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

const pack = getCompleteSecondaryVocabPack();
const report = buildSecondaryClozeCoverageReport(pack);

const textReport = formatSecondaryClozeCoverageReport(report);
const jsonPath = path.join(webRoot, "docs", "mastery", "secondary-cloze-coverage-report.json");

fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

console.log(textReport);
console.log("");
console.log(`Wrote ${jsonPath}`);

if (report.tierABPercent < SECONDARY_CLOZE_TIER_AB_MIN_PERCENT) {
  console.error(
    `FAIL: Tier A+B ${report.tierABPercent}% is below floor ${SECONDARY_CLOZE_TIER_AB_MIN_PERCENT}%`,
  );
  process.exit(1);
}

const tierCIssues = report.tierCItems.length;
if (tierCIssues > 0) {
  console.log(`Note: ${tierCIssues} tier C items need sentenceFrame or example fixes (see report).`);
}
