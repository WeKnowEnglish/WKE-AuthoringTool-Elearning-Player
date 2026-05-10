/**
 * Question bank for /teststartpage — compiled from A1 sentence bank + master vocabulary.
 */

import {
  STUDENT_MENU_TOPIC_IDS,
  type QuizBuildOptions,
  type QuizDifficultyLevel,
  type QuizQuestionCount,
  type QuizTopicId,
} from "@/lib/curated-sentences/quiz-compiler-types";
import { runQuizCompiler, type TestStartQuizQuestion } from "@/lib/curated-sentences/quiz-compiler";

export type TestStartTopicId = QuizTopicId;

export type { TestStartQuizQuestion, QuizBuildOptions, QuizQuestionCount, QuizDifficultyLevel };

/** Question counts shown after topic selection (not including legacy default 3). */
export const QUESTION_COUNT_OPTIONS = [6, 10, 15] as const satisfies readonly QuizQuestionCount[];

export const DIFFICULTY_OPTIONS = [1, 2, 3] as const satisfies readonly QuizDifficultyLevel[];

const MENU_LABELS: Record<QuizTopicId, string> = {
  food: "Food",
  school: "School",
  animals: "Animals",
  weather: "Weather",
  clothes: "Clothes",
  actions: "Actions",
};

/** Fixed order: six semantic cores for /teststartpage. */
export const TOPICS: { id: TestStartTopicId; label: string }[] = STUDENT_MENU_TOPIC_IDS.map((id) => ({
  id,
  label: MENU_LABELS[id],
}));

export function topicImagePlaceholder(topicId: TestStartTopicId): string {
  const label = TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
  return `https://placehold.co/960x540/e8defe/152668?text=${encodeURIComponent(`Topic: ${label}`)}`;
}

export function compileQuizForTopic(topicId: TestStartTopicId): TestStartQuizQuestion[] {
  return runQuizCompiler(topicId).questions;
}

/** Same as compiling for the page, but includes filter tier + warnings for QA. */
export function compileQuizForTopicWithDebug(
  topicId: TestStartTopicId,
  seed?: string,
  buildOptions?: Partial<QuizBuildOptions>,
) {
  return runQuizCompiler(topicId, seed, undefined, buildOptions);
}
