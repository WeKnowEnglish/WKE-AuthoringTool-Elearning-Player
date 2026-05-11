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

/**
 * Curated cover art for each menu topic (`Topic Cover URLS.xlsx` in repo root).
 * Missing keys fall back to {@link topicImagePlaceholder}.
 */
const TOPIC_COVER_URLS: Partial<Record<TestStartTopicId, string>> = {
  food: "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/9c8dade9-a589-430c-a952-e8d99eef1c8a-Food_Spelling_Cover.png",
  animals:
    "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/4eccbb91-f795-4fa4-9f2c-0181b07dd52c-Cover.png",
  school:
    "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/7800ea00-d17a-461d-8635-95564cf84322-cover.png",
  weather:
    "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/ca779b85-0413-47a1-9721-1db50d3401e0-Featured_Image_Weather.png",
  clothes:
    "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/177b67d5-1422-4ca3-9f35-bbab60ec212f-Featured_Image_Clothes.png",
};

export function topicImagePlaceholder(topicId: TestStartTopicId): string {
  const label = TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
  return `https://placehold.co/960x540/e8defe/152668?text=${encodeURIComponent(`Topic: ${label}`)}`;
}

/** Image URL for topic tiles and headers — curated cover when available. */
export function topicMenuImageSrc(topicId: TestStartTopicId): string {
  return TOPIC_COVER_URLS[topicId] ?? topicImagePlaceholder(topicId);
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
