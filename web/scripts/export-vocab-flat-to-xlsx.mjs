import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import { classifyClozeTierFromFlatItem } from "./lib/secondary-cloze-tier.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

const inputPath = path.join(webRoot, "g7-a2-complete-core-vocab-flat-items-v1_2.json");
const outputPath = path.join(webRoot, "g7-a2-complete-core-vocab-flat-items-v1_2.xlsx");

function joinList(value) {
  return Array.isArray(value) ? value.join("; ") : "";
}

function rowFromItem(item) {
  return {
    wordItemId: item.wordItemId ?? "",
    packId: item.packId ?? "",
    word: item.word ?? "",
    lemma: item.lemma ?? "",
    partOfSpeech: item.partOfSpeech ?? "",
    cefrLevel: item.cefrLevel ?? "",
    gradeBand: item.gradeBand ?? "",
    topicId: item.topicId ?? "",
    topicTitle: item.topicTitle ?? "",
    topicDescription: item.topicDescription ?? "",
    setId: item.setId ?? "",
    setTitle: item.setTitle ?? "",
    setDescription: item.setDescription ?? "",
    category: item.category ?? "",
    studentMeaningEn: item.studentMeaningEn ?? "",
    vnMeaning: item.vnMeaning ?? "",
    exampleSentence: item.exampleSentence ?? "",
    sentenceFrame: item.sentenceFrame ?? "",
    clozeTier: classifyClozeTierFromFlatItem(item),
    commonChunks: joinList(item.commonChunks),
    relatedWords: joinList(item.relatedWords),
    opposites: joinList(item.opposites),
    distractors: joinList(item.distractors),
    spellingSyllables: joinList(item.spellingSupport?.syllables),
    spellingCommonMistakes: joinList(item.spellingSupport?.commonMistakes),
    grammarCountability: item.grammarNotes?.countability ?? "",
    grammarVerbForm: item.grammarNotes?.verbForm ?? "",
    grammarAdjectivePattern: item.grammarNotes?.adjectivePattern ?? "",
    practiceTypes: joinList(item.practiceTypes),
    difficulty: item.difficulty ?? "",
    tags: joinList(item.tags),
    sourcePackId: item.sourcePackId ?? "",
    sourcePhase: item.sourcePhase ?? "",
    setPracticeFocus: joinList(item.setPracticeFocus),
  };
}

const items = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(items)) {
  throw new Error("Expected a JSON array of vocabulary items.");
}

const rows = items.map(rowFromItem);
const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Vocabulary");

worksheet["!cols"] = [
  { wch: 36 },
  { wch: 28 },
  { wch: 16 },
  { wch: 16 },
  { wch: 12 },
  { wch: 8 },
  { wch: 10 },
  { wch: 24 },
  { wch: 20 },
  { wch: 40 },
  { wch: 28 },
  { wch: 20 },
  { wch: 40 },
  { wch: 18 },
  { wch: 48 },
  { wch: 20 },
  { wch: 32 },
  { wch: 28 },
  { wch: 24 },
  { wch: 24 },
  { wch: 24 },
  { wch: 18 },
  { wch: 24 },
  { wch: 16 },
  { wch: 14 },
  { wch: 20 },
  { wch: 28 },
  { wch: 10 },
  { wch: 24 },
  { wch: 28 },
  { wch: 12 },
  { wch: 32 },
  { wch: 10 },
];

XLSX.writeFile(workbook, outputPath);
console.log(`Exported ${rows.length} rows to ${outputPath}`);
