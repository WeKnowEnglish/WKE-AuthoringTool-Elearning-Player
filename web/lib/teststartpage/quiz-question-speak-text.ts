import type { TestStartQuizQuestion } from "@/lib/teststartpage/bank";

/**
 * Short phrase to read aloud for a test-start quiz item (target vocabulary).
 * Not the full MCQ prompt sentence — the word students should hear.
 */
export function getTestStartQuizSpeakText(q: TestStartQuizQuestion): string | null {
  switch (q.subtype) {
    case "mc_quiz": {
      const correct = q.options.find((o) => o.id === q.correct_option_id);
      const t = correct?.label?.trim();
      return t || null;
    }
    case "fill_blanks": {
      const acc = q.blanks[0]?.acceptable;
      const t = acc?.find((a) => a.trim())?.trim();
      return t || null;
    }
    case "letter_mixup": {
      const t = q.items[0]?.target_word?.trim();
      return t || null;
    }
    default:
      return null;
  }
}
