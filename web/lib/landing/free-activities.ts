export type FreeActivityCard = {
  title: string;
  description: string;
  href: string;
  topic: string;
  cefr: string;
  gradeBand: "primary" | "upper-primary" | "secondary" | "mixed";
  skill: string;
  activityType: "flashcards" | "grammar_poster" | "learning_track" | "listen_choose" | "other";
  /** Prefer indexable destinations for SEO equity. */
  indexable: boolean;
};

/**
 * Real, shippable free activities only — no coming-soon stubs.
 * Prefer indexable grammar landings; pilots are playable but noindex.
 */
export const FREE_ACTIVITY_CARDS: FreeActivityCard[] = [
  {
    title: "There is / There are — Questions",
    description: "Interactive grammar poster for asking about what exists.",
    href: "/grammar/there-is-there-are-questions-a1",
    topic: "there-is-there-are",
    cefr: "A1",
    gradeBand: "primary",
    skill: "Grammar",
    activityType: "grammar_poster",
    indexable: true,
  },
  {
    title: "Countable Nouns",
    description: "Practice counting nouns and asking How manyΓÇª?",
    href: "/grammar/countable-nouns-a1",
    topic: "nouns",
    cefr: "A1",
    gradeBand: "primary",
    skill: "Grammar",
    activityType: "grammar_poster",
    indexable: true,
  },
  {
    title: "Hobbies Flashcards",
    description: "Picture and word flashcards for favourite hobbies vocabulary.",
    href: "/pilots/games-flashcards",
    topic: "hobbies",
    cefr: "A1",
    gradeBand: "primary",
    skill: "Vocabulary",
    activityType: "flashcards",
    indexable: false,
  },
  {
    title: "Hobbies Learning Track",
    description: "A short connected practice path for a hobbies lesson day.",
    href: "/pilots/learning-track",
    topic: "hobbies",
    cefr: "A1",
    gradeBand: "primary",
    skill: "Mixed skills",
    activityType: "learning_track",
    indexable: false,
  },
];
