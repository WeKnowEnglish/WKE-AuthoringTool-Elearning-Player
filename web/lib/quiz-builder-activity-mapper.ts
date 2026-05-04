import { interactionPayloadSchema } from "@/lib/lesson-schemas";
import type { Question } from "@/types/quiz-builder-brain";

const OPTION_IDS = ["a", "b", "c"] as const;

/** Map QuizBuilderBrain output into activity-library interaction payloads (Zod-validated). */
export function mapQuizQuestionToInteractionPayload(
  q: Question,
  idx: number,
  quizGroupId: string,
  quizGroupTitle: string,
): ReturnType<typeof interactionPayloadSchema.parse> {
  if (q.type === "mcq") {
    const options = q.options.map((label, i) => ({
      id: OPTION_IDS[i] ?? `o${i}`,
      label,
    }));
    const correctIdx = options.findIndex(
      (o) => o.label.toLowerCase() === q.correctAnswer.toLowerCase(),
    );
    const correctId = options[correctIdx]?.id ?? "a";
    return interactionPayloadSchema.parse({
      type: "interaction",
      subtype: "mc_quiz",
      question: q.prompt,
      options,
      correct_option_id: correctId,
      shuffle_options: true,
      quiz_group_id: quizGroupId,
      quiz_group_title: quizGroupTitle,
      quiz_group_order: idx,
    });
  }

  if (q.type === "fill_blank") {
    const template = q.prompt.includes("___") ? q.prompt.replace("___", "__1__") : q.prompt;
    return interactionPayloadSchema.parse({
      type: "interaction",
      subtype: "fill_blanks",
      image_fit: "contain",
      template,
      blanks: [{ id: "1", acceptable: [q.correctAnswer] }],
      word_bank: [q.correctAnswer],
      quiz_group_id: quizGroupId,
      quiz_group_title: quizGroupTitle,
      quiz_group_order: idx,
    });
  }

  return interactionPayloadSchema.parse({
    type: "interaction",
    subtype: "letter_mixup",
    prompt: "Reorder the letters to spell the word.",
    shuffle_letters: true,
    case_sensitive: false,
    items: [
      {
        id: "lm1",
        target_word: q.correctAnswer,
        accepted_words: [q.correctAnswer],
      },
    ],
    image_fit: "contain",
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    quiz_group_order: idx,
  });
}

export function vocabularyFromQuizQuestions(questions: Question[]): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    set.add(q.correctAnswer);
    if (q.type === "mcq") {
      for (const o of q.options) set.add(o);
    }
  }
  return Array.from(set).slice(0, 40);
}
