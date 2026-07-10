import type { LessonScreenRow } from "@/lib/lesson/types";
import { getGrammarCatalogEntry } from "@/lib/grammar-builder/load-catalog";
import { buildCongratsEndPayload } from "@/lib/lesson-bookends";
import { startPayloadSchema } from "@/lib/lesson-schemas";
import { buildGrammarQuizScreens, hasGrammarQuiz } from "./grammar-quiz-items";

export function grammarLessonId(slug: string): string {
  return `grammar-${slug}`;
}

export type BuildGrammarPosterScreensOptions = {
  /** When true, append T/F quiz screens after the poster when a quiz registry exists. */
  includeQuiz?: boolean;
};

export function buildGrammarPosterScreens(
  slug: string,
  options?: BuildGrammarPosterScreensOptions,
): LessonScreenRow[] {
  const entry = getGrammarCatalogEntry(slug);
  if (!entry || entry.status !== "published") {
    throw new Error(`Grammar poster is not published: ${slug}`);
  }

  const lessonId = grammarLessonId(slug);
  const title = entry.title;
  const includeQuiz = options?.includeQuiz ?? hasGrammarQuiz(slug);

  const openingPayload = startPayloadSchema.parse({
    type: "start",
    cta_label: includeQuiz ? "Start practice" : "Start reading",
    read_aloud_title: title,
    image_fit: "contain",
  });

  const rows: LessonScreenRow[] = [
    {
      id: `${lessonId}-start`,
      lesson_id: lessonId,
      order_index: 0,
      screen_type: "start",
      payload: openingPayload,
    },
    {
      id: `${lessonId}-poster`,
      lesson_id: lessonId,
      order_index: 1,
      screen_type: "grammar",
      payload: {
        type: "grammar",
        grammar_slug: slug,
        mode: includeQuiz ? "read_then_quiz" : "read",
      },
    },
  ];

  let order = 2;
  if (includeQuiz) {
    const quizScreens = buildGrammarQuizScreens(slug, lessonId, order);
    rows.push(...quizScreens);
    order += quizScreens.length;
  }

  rows.push({
    id: `${lessonId}-finish`,
    lesson_id: lessonId,
    order_index: order,
    screen_type: "start",
    payload: buildCongratsEndPayload(),
  });

  return rows;
}
