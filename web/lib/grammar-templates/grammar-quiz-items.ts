import type { LessonScreenRow } from "@/lib/data/catalog";
import { trueFalsePayloadSchema } from "@/lib/lesson-schemas";

export type GrammarQuizItem = {
  id: string;
  statement: string;
  correct: boolean;
  pictureTruthStatement?: string;
};

const GRAMMAR_QUIZ_BY_SLUG: Record<string, GrammarQuizItem[]> = {
  "short-answers-there-is-a1": [
    {
      id: "sa-tf-1",
      statement: "Is there a book on the desk? — Yes, there is.",
      correct: true,
      pictureTruthStatement: "Yes, there is a book on the desk.",
    },
    {
      id: "sa-tf-2",
      statement: "Are there a apple? — Yes, there are.",
      correct: false,
      pictureTruthStatement: "Are there any apples? — Yes, there are.",
    },
    {
      id: "sa-tf-3",
      statement: "Is there any milk? — No, there isn't.",
      correct: true,
      pictureTruthStatement: "No, there isn't any milk.",
    },
  ],
};

export function getGrammarQuizItems(slug: string): GrammarQuizItem[] {
  return GRAMMAR_QUIZ_BY_SLUG[slug] ?? [];
}

export function hasGrammarQuiz(slug: string): boolean {
  return getGrammarQuizItems(slug).length > 0;
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
