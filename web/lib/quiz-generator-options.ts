import type { CefrLevel, GenerateQuizOptions, QuizMode } from "@/types/quiz-builder-brain";

/** Topics used when preset is Quick Play (random pick). Keep in sync with seed data. */
export const QUIZ_QUICK_TOPICS = ["food", "body_parts", "daily_life", "school"] as const;

export function resolveQuickTopic(): string {
  const i = Math.floor(Math.random() * QUIZ_QUICK_TOPICS.length);
  return QUIZ_QUICK_TOPICS[i]!;
}

export function buildGenerateQuizOptions(args: {
  preset: "quick" | "topic";
  topicPractice: string;
  level: CefrLevel;
  questionCount: number;
}): GenerateQuizOptions {
  const topic = args.preset === "quick" ? resolveQuickTopic() : args.topicPractice.trim();
  const mode: QuizMode = args.preset === "quick" ? "quick" : "practice";
  return {
    topic,
    level: args.level,
    mode,
    questionCount: args.questionCount,
  };
}
