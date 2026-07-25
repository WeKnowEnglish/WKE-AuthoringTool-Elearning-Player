/**
 * Self Study lesson pack — 8-lesson spine for Primary bite-sized content.
 * Pilot catalog only; runtime screens come later.
 */

export const SELF_STUDY_LESSON_SLOTS = [
  {
    slot: 1,
    functionLabel: "Introduce topic, activate prior knowledge, learn new words",
  },
  {
    slot: 2,
    functionLabel: "Practice words, learn grammar, speaking",
  },
  {
    slot: 3,
    functionLabel: "Read a short comic / story / infographic",
  },
  {
    slot: 4,
    functionLabel: "Learn new vocabulary, practice talking about personal life",
  },
  {
    slot: 5,
    functionLabel: "Grammar",
  },
  {
    slot: 6,
    functionLabel: "Write a short note / story",
  },
  {
    slot: 7,
    functionLabel: "Apply new information to achieve a task",
  },
  {
    slot: 8,
    functionLabel: "Review / consolidate / assessment",
  },
] as const;

export type SelfStudyLessonSlot = (typeof SELF_STUDY_LESSON_SLOTS)[number]["slot"];

export type SelfStudyPackStatus = "planned" | "draft" | "ready";

export type SelfStudyPackSummary = {
  id: string;
  title: string;
  subtitle: string;
  /** Cover image for list cards */
  coverImageUrl: string;
  /** CEFR-ish band for Primary planning */
  levelLabel: string;
  status: SelfStudyPackStatus;
  /** Always 8 for this format; kept explicit for UI. */
  lessonCount: 8;
  /** Short note for the pilot list (what we’ll build first). */
  buildNote: string;
};
