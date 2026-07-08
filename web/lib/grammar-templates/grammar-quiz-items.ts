import type { LessonScreenRow } from "@/lib/data/catalog";
import { trueFalsePayloadSchema } from "@/lib/lesson-schemas";

export type GrammarQuizItem = {
  id: string;
  statement: string;
  correct: boolean;
  pictureTruthStatement?: string;
  /** GKE L4 micro-skill id — required for mastery emission */
  microSkillId: string;
  /** When student misses a trap item, optional GKE error code */
  errorCodeOnMiss?: string;
  /** Optional display label for mastery target */
  microSkillLabel?: string;
};

const GRAMMAR_QUIZ_BY_SLUG: Record<string, GrammarQuizItem[]> = {
  "short-answers-there-is-a1": [
    {
      id: "sa-tf-1",
      statement: "Is there a book on the desk? — Yes, there is.",
      correct: true,
      pictureTruthStatement: "Yes, there is a book on the desk.",
      microSkillId:
        "grammar.existential.there_is_are.short_answers.positive_negative_singular",
      microSkillLabel: "Short answers singular",
    },
    {
      id: "sa-tf-2",
      statement: "Are there a apple? — Yes, there are.",
      correct: false,
      pictureTruthStatement: "Are there any apples? — Yes, there are.",
      microSkillId:
        "grammar.existential.there_is_are.short_answers.positive_negative_plural",
      microSkillLabel: "Short answers plural",
      errorCodeOnMiss: "error.agreement.there_are_singular",
    },
    {
      id: "sa-tf-3",
      statement: "Is there any milk? — No, there isn't.",
      correct: true,
      pictureTruthStatement: "No, there isn't any milk.",
      microSkillId:
        "grammar.existential.there_is_are.short_answers.positive_negative_singular",
      microSkillLabel: "Short answers singular",
    },
  ],
};

export function getGrammarQuizItems(slug: string): GrammarQuizItem[] {
  return GRAMMAR_QUIZ_BY_SLUG[slug] ?? [];
}

export function hasGrammarQuiz(slug: string): boolean {
  return getGrammarQuizItems(slug).length > 0;
}

export function getGrammarQuizItemById(
  slug: string,
  itemId: string,
): GrammarQuizItem | null {
  return getGrammarQuizItems(slug).find((item) => item.id === itemId) ?? null;
}

/** Resolve a grammar poster quiz item from a LessonPlayer screen row. */
export function getGrammarQuizItemForLessonScreen(input: {
  lessonId: string;
  screenId: string;
}): GrammarQuizItem | null {
  if (!input.lessonId.startsWith("grammar-")) return null;
  const slug = input.lessonId.slice("grammar-".length);
  const prefix = `${input.lessonId}-quiz-`;
  if (!input.screenId.startsWith(prefix)) return null;
  const itemId = input.screenId.slice(prefix.length);
  return getGrammarQuizItemById(slug, itemId);
}

export function buildGrammarTrueFalsePayload(item: GrammarQuizItem): Record<string, unknown> {
  return trueFalsePayloadSchema.parse({
    type: "interaction",
    subtype: "true_false",
    statement: item.statement,
    correct: item.correct,
    picture_truth_statement: item.pictureTruthStatement,
  });
}

export function buildGrammarQuizScreens(
  slug: string,
  lessonId: string,
  startOrder: number,
): LessonScreenRow[] {
  const items = getGrammarQuizItems(slug);
  return items.map((item, index) => ({
    id: `${lessonId}-quiz-${item.id}`,
    lesson_id: lessonId,
    order_index: startOrder + index,
    screen_type: "interaction" as const,
    payload: buildGrammarTrueFalsePayload(item),
  }));
}
