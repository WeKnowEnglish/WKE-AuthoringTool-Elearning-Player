import { mcQuizPayloadSchema } from "@/lib/lesson-schemas";
import type { PackQuizCompiledQuestion, PackQuizMcMode } from "./compile-pack-mc-quiz";

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
  return questions.map((q) => {
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

export type SheetRowsToQuestionsResult =
  | { ok: true; questions: PackQuizCompiledQuestion[] }
  | { ok: false; error: string };

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

  const questions: PackQuizCompiledQuestion[] = [];
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
      mode: row.mode,
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
    return {
      ...q,
      payload: {
        ...q.payload,
        image_url: url,
        image_fit: q.payload.image_fit ?? "contain",
      },
    };
  });
}
