export type LanguageInFocusMorphology = {
  marks: string[];
  word_suffixes: string[];
  highlight_words: string[];
};

/** Defaults keep existing like/-ing pilots looking the same when morphology is omitted. */
export const DEFAULT_LANGUAGE_IN_FOCUS_MORPHOLOGY: LanguageInFocusMorphology = {
  marks: ["-s", "-ing", "+s", "+ing", "s", "ing"],
  word_suffixes: ["ing"],
  highlight_words: ["likes"],
};

export function resolveMorphology(
  morphology?: Partial<LanguageInFocusMorphology> | null,
): LanguageInFocusMorphology {
  return {
    marks:
      morphology?.marks && morphology.marks.length > 0
        ? morphology.marks
        : DEFAULT_LANGUAGE_IN_FOCUS_MORPHOLOGY.marks,
    word_suffixes:
      morphology?.word_suffixes && morphology.word_suffixes.length > 0
        ? morphology.word_suffixes
        : DEFAULT_LANGUAGE_IN_FOCUS_MORPHOLOGY.word_suffixes,
    highlight_words:
      morphology?.highlight_words && morphology.highlight_words.length > 0
        ? morphology.highlight_words
        : DEFAULT_LANGUAGE_IN_FOCUS_MORPHOLOGY.highlight_words,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a splitter that captures morphology marks, highlight words, and suffix words. */
export function morphologySplitPattern(morphology: LanguageInFocusMorphology): RegExp {
  const parts: string[] = [];
  for (const word of morphology.highlight_words) {
    if (word.trim()) parts.push(`\\b${escapeRegExp(word.trim())}\\b`);
  }
  for (const suffix of morphology.word_suffixes) {
    const s = suffix.trim();
    if (!s) continue;
    if (s === "n't") {
      parts.push(`\\b\\w+n'?t\\b`);
    } else {
      parts.push(`\\b\\w*${escapeRegExp(s)}\\b`);
    }
  }
  for (const mark of morphology.marks) {
    if (mark.trim()) parts.push(escapeRegExp(mark.trim()));
  }
  if (parts.length === 0) return /(.*?)/;
  return new RegExp(`(${parts.join("|")})`, "gi");
}

export function isMorphologyMark(
  text: string,
  morphology?: LanguageInFocusMorphology | null,
): boolean {
  const marks = resolveMorphology(morphology).marks;
  const normalized = text.trim().toLowerCase();
  return marks.some((mark) => mark.trim().toLowerCase() === normalized);
}

export function isHighlightedWord(
  text: string,
  morphology?: LanguageInFocusMorphology | null,
): boolean {
  const resolved = resolveMorphology(morphology);
  const normalized = text.trim().toLowerCase();
  if (resolved.highlight_words.some((word) => word.trim().toLowerCase() === normalized)) {
    return true;
  }
  return resolved.word_suffixes.some((suffix) => {
    const s = suffix.trim().toLowerCase();
    if (!s) return false;
    if (s === "n't") return /n'?t$/i.test(normalized) && normalized.length > 3;
    return normalized.length > s.length && normalized.endsWith(s);
  });
}

/** Highlight the letters added when turning base → form (e.g. like→likes, can→can't). */
export function splitStemAndSuffix(
  base: string,
  form: string,
): { stem: string; suffix: string } {
  const a = base.toLowerCase();
  const b = form.toLowerCase();
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return { stem: form.slice(0, i), suffix: form.slice(i) };
}
