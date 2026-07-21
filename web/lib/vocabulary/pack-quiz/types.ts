/**
 * Pack → quiz draft contract (Slice 0+).
 * Formats are selectable now; generation lands per-format later.
 */

export type PackQuizFormat =
  | "multiple_choice"
  | "true_false"
  | "letter_scramble"
  | "sentence_scramble";

export type PackQuizDraft = {
  packId: string;
  packTitle: string;
  format: PackQuizFormat;
  /** Frozen snapshot of pack word ids at draft creation. */
  wordIds: string[];
  options: {
    questionCount?: number;
  };
  createdAt: string;
};

export type PackQuizFormatMeta = {
  id: PackQuizFormat;
  label: string;
  description: string;
  /** Minimum words required in the frozen pack snapshot. */
  minWords: number;
  /** Slice that will implement generation (0 = shell only). */
  implementedInSlice: number;
};

export const PACK_QUIZ_FORMATS: readonly PackQuizFormatMeta[] = [
  {
    id: "multiple_choice",
    label: "Multiple choice",
    description: "Pick the right word or meaning from options drawn from this pack.",
    minWords: 4,
    /** 0 = available now (teacher preview). */
    implementedInSlice: 0,
  },
  {
    id: "true_false",
    label: "True / False",
    description: "Quick recognition checks — match or reject a claim about each word.",
    minWords: 1,
    implementedInSlice: 2,
  },
  {
    id: "letter_scramble",
    label: "Letter scramble",
    description: "Unscramble the letters to spell the word.",
    minWords: 1,
    implementedInSlice: 3,
  },
  {
    id: "sentence_scramble",
    label: "Sentence scramble",
    description: "Put the words of a sentence back in order (needs sentence support later).",
    minWords: 1,
    implementedInSlice: 4,
  },
] as const;

export function getPackQuizFormatMeta(format: PackQuizFormat): PackQuizFormatMeta {
  const found = PACK_QUIZ_FORMATS.find((f) => f.id === format);
  if (!found) throw new Error(`Unknown pack quiz format: ${format}`);
  return found;
}

export function createPackQuizDraft(input: {
  packId: string;
  packTitle: string;
  format: PackQuizFormat;
  wordIds: readonly string[];
  questionCount?: number;
}): PackQuizDraft {
  return {
    packId: input.packId,
    packTitle: input.packTitle,
    format: input.format,
    wordIds: [...input.wordIds],
    options: {
      questionCount: input.questionCount,
    },
    createdAt: new Date().toISOString(),
  };
}

export function isPackQuizFormatAvailable(format: PackQuizFormat): boolean {
  return getPackQuizFormatMeta(format).implementedInSlice === 0;
}

export function packQuizFormatReadiness(
  format: PackQuizFormat,
  wordCount: number,
): { ok: boolean; reason?: string } {
  const meta = getPackQuizFormatMeta(format);
  if (wordCount < meta.minWords) {
    return {
      ok: false,
      reason: `Needs at least ${meta.minWords} word${meta.minWords === 1 ? "" : "s"} in the pack (you have ${wordCount}).`,
    };
  }
  return { ok: true };
}

/** Formats not yet generating — Continue shows this after freezing the draft. */
export function packQuizComingSoonMessage(format: PackQuizFormat): string {
  const meta = getPackQuizFormatMeta(format);
  return `${meta.label} is next on the roadmap (Slice ${meta.implementedInSlice}). Teacher preview generation isn’t wired yet — this step only freezes your pack word list.`;
}
