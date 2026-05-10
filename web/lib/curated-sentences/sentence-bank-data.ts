import type { SentenceBankCsvRow } from "./quiz-compiler-types";
import sentenceBankGenerated from "./sentence-bank.generated.json";

export const SENTENCE_BANK_ROWS_RAW = sentenceBankGenerated as SentenceBankCsvRow[];
