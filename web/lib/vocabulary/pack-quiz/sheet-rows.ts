import {
  mcQuizPayloadSchema,
  trueFalsePayloadSchema,
  letterMixupPayloadSchema,
} from "@/lib/lesson-schemas";
import type {
  PackQuizCompiledQuestion,
  PackQuizLetterScrambleCompiledQuestion,
  PackQuizMcCompiledQuestion,
  PackQuizMcMode,
  PackQuizSentenceScrambleCompiledQuestion,
  PackQuizTrueFalseCompiledQuestion,
} from "./compiled-question";
import { isPackQuizMcQuestion } from "./compiled-question";
import {
  PACK_LETTER_SCRAMBLE_PROMPT,
  packLetterScrambleAcceptedWords,
} from "./compile-pack-letter-scramble-quiz";
import {
  buildDragSentencePayloadFromText,
  PACK_SENTENCE_SCRAMBLE_BODY,
} from "./compile-pack-sentence-scramble-quiz";

export type PackQuizSheetRow = {
  id: string;
  wordId: string;
  mode: PackQuizMcMode;
  prompt: string;
  /** Optional prompt image (`mc_quiz.image_url`). Empty = none. */
  promptImageUrl: string;
  correct: string;
  wrongs: [string, string, string];
};

/** Spreadsheet row for true/false pack quizzes. */
export type PackQuizTfSheetRow = {
  id: string;
  wordId: string;
  statement: string;
  correct: boolean;
  /** Optional prompt image (`true_false.image_url`). Empty = none. */
  promptImageUrl: string;
  /** Corrective truth line (`picture_truth_statement`). */
  truthStatement: string;
};

/** Spreadsheet row for letter-scramble pack quizzes. */
export type PackQuizLetterSheetRow = {
  id: string;
  wordId: string;
  prompt: string;
  targetWord: string;
  /** Optional prompt image (`letter_mixup.image_url`). Empty = none. */
  promptImageUrl: string;
  /**
   * Extra accepted spellings (comma-separated), beyond auto lemma + Capitalized.
   * Empty = use defaults from target word only.
   */
  extraAccepted: string;
};

/** Spreadsheet row for sentence-scramble pack quizzes. */
export type PackQuizSentenceSheetRow = {
  id: string;
  wordId: string;
  /** Full correct sentence (space-separated tokens on save). */
  sentence: string;
  bodyText: string;
  /** Optional prompt image (`drag_sentence.image_url`). Empty = none. */
  promptImageUrl: string;
};

export const PACK_QUIZ_MC_MODES: readonly PackQuizMcMode[] = [
  "word_for_meaning_en",
  "meaning_for_word_en",
  "find_lemma",
] as const;

const MODE_LABELS: Record<PackQuizMcMode, string> = {
  word_for_meaning_en: "Meaning → word",
  meaning_for_word_en: "Word → meaning",
  find_lemma: "Find the word",
};

const OPTION_IDS = ["a", "b", "c", "d"] as const;

export function packQuizMcModeLabel(mode: PackQuizMcMode): string {
  return MODE_LABELS[mode] ?? mode;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Flatten compiled MC questions into spreadsheet rows (prompt / image / correct / 3 wrongs).
 * Extra options beyond the correct + 3 wrongs are dropped; missing wrongs pad as "".
 */
export function packQuizQuestionsToSheetRows(
  questions: readonly PackQuizCompiledQuestion[],
): PackQuizSheetRow[] {
  return questions.filter(isPackQuizMcQuestion).map((q) => {
    const options = q.payload.options ?? [];
    const correct =
      options.find((o) => o.id === q.payload.correct_option_id)?.label?.trim() ?? "";
    const wrongs = options
      .filter((o) => o.id !== q.payload.correct_option_id)
      .map((o) => o.label?.trim() ?? "")
      .slice(0, 3);
    while (wrongs.length < 3) wrongs.push("");
    return {
      id: q.id,
      wordId: q.wordId,
      mode: q.mode,
      prompt: q.payload.question ?? "",
      promptImageUrl: q.payload.image_url?.trim() ?? "",
      correct,
      wrongs: [wrongs[0]!, wrongs[1]!, wrongs[2]!],
    };
  });
}

export function isPackQuizTfQuestion(
  q: PackQuizCompiledQuestion,
): q is PackQuizTrueFalseCompiledQuestion {
  return q.format === "true_false";
}

export function packQuizQuestionsToTfSheetRows(
  questions: readonly PackQuizCompiledQuestion[],
): PackQuizTfSheetRow[] {
  return questions.filter(isPackQuizTfQuestion).map((q) => ({
    id: q.id,
    wordId: q.wordId,
    statement: q.payload.statement ?? "",
    correct: Boolean(q.payload.correct),
    promptImageUrl: q.payload.image_url?.trim() ?? "",
    truthStatement: q.payload.picture_truth_statement?.trim() ?? "",
  }));
}

export function isPackQuizLetterQuestion(
  q: PackQuizCompiledQuestion,
): q is PackQuizLetterScrambleCompiledQuestion {
  return q.format === "letter_scramble";
}

function extraAcceptedFromItem(
  targetWord: string,
  accepted: readonly string[] | undefined,
): string {
  const defaults = new Set(
    packLetterScrambleAcceptedWords(targetWord).map((w) => w.trim().toLowerCase()),
  );
  const extras = (accepted ?? [])
    .map((w) => w.trim())
    .filter((w) => w && !defaults.has(w.toLowerCase()));
  return extras.join(", ");
}

export function packQuizQuestionsToLetterSheetRows(
  questions: readonly PackQuizCompiledQuestion[],
): PackQuizLetterSheetRow[] {
  return questions.filter(isPackQuizLetterQuestion).map((q) => {
    const item = q.payload.items[0];
    const targetWord = item?.target_word?.trim() ?? "";
    return {
      id: q.id,
      wordId: q.wordId,
      prompt: q.payload.prompt ?? PACK_LETTER_SCRAMBLE_PROMPT,
      targetWord,
      promptImageUrl: q.payload.image_url?.trim() ?? "",
      extraAccepted: extraAcceptedFromItem(targetWord, item?.accepted_words),
    };
  });
}

export type SheetRowsToQuestionsResult =
  | { ok: true; questions: PackQuizMcCompiledQuestion[] }
  | { ok: false; error: string };

export type TfSheetRowsToQuestionsResult =
  | { ok: true; questions: PackQuizTrueFalseCompiledQuestion[] }
  | { ok: false; error: string };

export type LetterSheetRowsToQuestionsResult =
  | { ok: true; questions: PackQuizLetterScrambleCompiledQuestion[] }
  | { ok: false; error: string };

export type SentenceSheetRowsToQuestionsResult =
  | { ok: true; questions: PackQuizSentenceScrambleCompiledQuestion[] }
  | { ok: false; error: string };

export function isPackQuizSentenceQuestion(
  q: PackQuizCompiledQuestion,
): q is PackQuizSentenceScrambleCompiledQuestion {
  return q.format === "sentence_scramble";
}

export function packQuizQuestionsToSentenceSheetRows(
  questions: readonly PackQuizCompiledQuestion[],
): PackQuizSentenceSheetRow[] {
  return questions.filter(isPackQuizSentenceQuestion).map((q) => ({
    id: q.id,
    wordId: q.wordId,
    sentence: (q.payload.correct_order ?? []).join(" "),
    bodyText: q.payload.body_text?.trim() || PACK_SENTENCE_SCRAMBLE_BODY,
    promptImageUrl: q.payload.image_url?.trim() ?? "",
  }));
}

/**
 * Rebuild MC question payloads from spreadsheet rows.
 * Correct is option `a`; wrongs are `b`–`d` (stable for editing — no reshuffle).
 */
export function sheetRowsToPackQuizQuestions(
  rows: readonly PackQuizSheetRow[],
): SheetRowsToQuestionsResult {
  if (rows.length === 0) {
    return { ok: false, error: "Quiz needs at least one question." };
  }

  const questions: PackQuizMcCompiledQuestion[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const n = i + 1;
    const prompt = row.prompt.trim();
    const correct = row.correct.trim();
    const wrongs = row.wrongs.map((w) => w.trim());
    const imageUrl = row.promptImageUrl.trim();

    if (!row.id.trim() || !row.wordId.trim()) {
      return { ok: false, error: `Question ${n}: missing id.` };
    }
    if (!(PACK_QUIZ_MC_MODES as readonly string[]).includes(row.mode)) {
      return { ok: false, error: `Question ${n}: unknown mode.` };
    }
    if (!prompt) {
      return { ok: false, error: `Question ${n}: prompt is empty.` };
    }
    if (!correct) {
      return { ok: false, error: `Question ${n}: correct answer is empty.` };
    }
    if (wrongs.some((w) => !w)) {
      return { ok: false, error: `Question ${n}: all three wrong answers are required.` };
    }

    const labels = [correct, wrongs[0]!, wrongs[1]!, wrongs[2]!];
    const keys = labels.map(normalizeKey);
    if (new Set(keys).size !== 4) {
      return { ok: false, error: `Question ${n}: options must be unique.` };
    }

    const options = labels.map((label, oi) => ({
      id: OPTION_IDS[oi]!,
      label,
    }));

    const payload = mcQuizPayloadSchema.parse({
      type: "interaction",
      subtype: "mc_quiz",
      question: prompt,
      options,
      correct_option_id: "a",
      shuffle_options: false,
      ...(imageUrl ? { image_url: imageUrl, image_fit: "contain" as const } : {}),
    });

    questions.push({
      id: row.id,
      wordId: row.wordId,
      format: "multiple_choice",
      mode: row.mode,
      payload,
    });
  }

  return { ok: true, questions };
}

/**
 * Rebuild true/false payloads from spreadsheet rows.
 */
export function sheetTfRowsToPackQuizQuestions(
  rows: readonly PackQuizTfSheetRow[],
): TfSheetRowsToQuestionsResult {
  if (rows.length === 0) {
    return { ok: false, error: "Quiz needs at least one question." };
  }

  const questions: PackQuizTrueFalseCompiledQuestion[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const n = i + 1;
    const statement = row.statement.trim();
    const imageUrl = row.promptImageUrl.trim();
    const truth = row.truthStatement.trim();

    if (!row.id.trim() || !row.wordId.trim()) {
      return { ok: false, error: `Question ${n}: missing id.` };
    }
    if (!statement) {
      return { ok: false, error: `Question ${n}: statement is empty.` };
    }

    const payload = trueFalsePayloadSchema.parse({
      type: "interaction",
      subtype: "true_false",
      statement,
      correct: row.correct,
      ...(truth ? { picture_truth_statement: truth } : {}),
      ...(imageUrl ? { image_url: imageUrl, image_fit: "contain" as const } : {}),
    });

    questions.push({
      id: row.id,
      wordId: row.wordId,
      format: "true_false",
      payload,
    });
  }

  return { ok: true, questions };
}

/**
 * Rebuild letter-scramble (`letter_mixup`) payloads from spreadsheet rows.
 */
export function sheetLetterRowsToPackQuizQuestions(
  rows: readonly PackQuizLetterSheetRow[],
): LetterSheetRowsToQuestionsResult {
  if (rows.length === 0) {
    return { ok: false, error: "Quiz needs at least one question." };
  }

  const questions: PackQuizLetterScrambleCompiledQuestion[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const n = i + 1;
    const prompt = row.prompt.trim() || PACK_LETTER_SCRAMBLE_PROMPT;
    const targetWord = row.targetWord.trim();
    const imageUrl = row.promptImageUrl.trim();

    if (!row.id.trim() || !row.wordId.trim()) {
      return { ok: false, error: `Question ${n}: missing id.` };
    }
    if (!targetWord) {
      return { ok: false, error: `Question ${n}: target word is empty.` };
    }
    if ((targetWord.match(/[a-zA-Z]/g) ?? []).length < 2) {
      return {
        ok: false,
        error: `Question ${n}: target word needs at least 2 letters.`,
      };
    }

    const accepted = [
      ...packLetterScrambleAcceptedWords(targetWord),
      ...row.extraAccepted
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean),
    ];
    const seen = new Set<string>();
    const acceptedUnique: string[] = [];
    for (const w of accepted) {
      const key = w.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      acceptedUnique.push(w);
    }

    const payload = letterMixupPayloadSchema.parse({
      type: "interaction",
      subtype: "letter_mixup",
      prompt,
      items: [
        {
          id: row.wordId,
          target_word: targetWord,
          accepted_words: acceptedUnique,
        },
      ],
      shuffle_letters: true,
      letter_shuffle_seed: `${row.id}:letters`,
      case_sensitive: false,
      image_use_tts: true,
      image_read_aloud_text: targetWord,
      ...(imageUrl ? { image_url: imageUrl, image_fit: "contain" as const } : {}),
    });

    questions.push({
      id: row.id,
      wordId: row.wordId,
      format: "letter_scramble",
      payload,
    });
  }

  return { ok: true, questions };
}

/**
 * Rebuild sentence-scramble (`drag_sentence`) payloads from spreadsheet rows.
 */
export function sheetSentenceRowsToPackQuizQuestions(
  rows: readonly PackQuizSentenceSheetRow[],
): SentenceSheetRowsToQuestionsResult {
  if (rows.length === 0) {
    return { ok: false, error: "Quiz needs at least one question." };
  }

  const questions: PackQuizSentenceScrambleCompiledQuestion[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const n = i + 1;
    const sentence = row.sentence.trim();
    const bodyText = row.bodyText.trim() || PACK_SENTENCE_SCRAMBLE_BODY;
    const imageUrl = row.promptImageUrl.trim();

    if (!row.id.trim() || !row.wordId.trim()) {
      return { ok: false, error: `Question ${n}: missing id.` };
    }
    if (!sentence) {
      return { ok: false, error: `Question ${n}: sentence is empty.` };
    }

    const payload = buildDragSentencePayloadFromText({
      sentence,
      seed: `${row.id}:sheet`,
      bodyText,
      imageUrl,
    });
    if (!payload) {
      return {
        ok: false,
        error: `Question ${n}: sentence needs at least 2 words.`,
      };
    }

    questions.push({
      id: row.id,
      wordId: row.wordId,
      format: "sentence_scramble",
      payload,
    });
  }

  return { ok: true, questions };
}

/**
 * Copy prompt images from a previous question set onto newly compiled questions
 * (matched by wordId). Used so Regenerate keeps teacher-added images.
 */
export function preservePromptImagesByWordId(
  next: readonly PackQuizCompiledQuestion[],
  previous: readonly PackQuizCompiledQuestion[],
): PackQuizCompiledQuestion[] {
  const imageByWord = new Map<string, string>();
  for (const q of previous) {
    const url = q.payload.image_url?.trim();
    if (url) imageByWord.set(q.wordId, url);
  }
  if (imageByWord.size === 0) return [...next];

  return next.map((q) => {
    const url = imageByWord.get(q.wordId);
    if (!url) return q;
    // Preserve discriminant: spreading payload through the union needs a cast.
    return {
      ...q,
      payload: {
        ...q.payload,
        image_url: url,
        image_fit: q.payload.image_fit ?? "contain",
      },
    } as PackQuizCompiledQuestion;
  });
}
