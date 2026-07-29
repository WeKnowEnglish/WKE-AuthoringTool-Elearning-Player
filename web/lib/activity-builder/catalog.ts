/**
 * Activity Builder catalog (Phase 1 hub).
 * Authoring workspaces land in later phases; creator labs stay in EDU Studio.
 */

export type ActivityBuilderStatus =
  | "authoring_ready"
  | "authoring_soon"
  | "play_in_bank"
  | "studio_interim";

export type ActivityBuilderCard = {
  id: string;
  title: string;
  description: string;
  badge: string;
  /** Relative path under /teacher/activity-builder when authoring exists in LP. */
  lpPath?: string;
  /** Path on EDU Studio for interim authoring until the workspace is ported. */
  studioPath?: string;
  status: ActivityBuilderStatus;
  /** Formats already stored/played via Activity Bank. */
  bankFormats?: string[];
};

export type ActivityBuilderSection = {
  id: string;
  label: string;
  toneClass: string;
  cards: ActivityBuilderCard[];
};

export const ACTIVITY_BUILDER_SECTIONS: ActivityBuilderSection[] = [
  {
    id: "vocab",
    label: "1 · Vocabulary",
    toneClass: "text-sky-800",
    cards: [
      {
        id: "vocabulary-lists",
        title: "Vocabulary lists",
        description: "Central word bank — compile into quizzes for tracks.",
        badge: "Vocab",
        lpPath: "/vocabulary-lists",
        studioPath: "/activity-builder/vocabulary-lists",
        status: "authoring_ready",
      },
    ],
  },
  {
    id: "quizzes",
    label: "2 · Quizzes from vocabulary",
    toneClass: "text-amber-800",
    cards: [
      {
        id: "multiple-choice",
        title: "Multiple choice",
        description: "Compile from a vocabulary list in Lesson Player → Activity Bank.",
        badge: "Quizzes",
        lpPath: "/vocabulary-lists",
        studioPath: "/activity-builder/games",
        status: "authoring_ready",
        bankFormats: ["multiple_choice"],
      },
      {
        id: "flashcards",
        title: "Flashcards",
        description: "Compile from a vocabulary list in Lesson Player → Activity Bank.",
        badge: "Quizzes",
        lpPath: "/vocabulary-lists",
        studioPath: "/activity-builder/games/flashcards",
        status: "authoring_ready",
        bankFormats: ["flashcards"],
      },
      {
        id: "letter-mixup",
        title: "Letter scramble",
        description: "Compile from a vocabulary list in Lesson Player → Activity Bank.",
        badge: "Quizzes",
        lpPath: "/vocabulary-lists",
        studioPath: "/activity-builder/games/letter-mixup",
        status: "authoring_ready",
        bankFormats: ["letter_mixup"],
      },
      {
        id: "sentence-scramble",
        title: "Sentence scramble",
        description: "Rebuild sentences from a word bank.",
        badge: "Quizzes",
        studioPath: "/activity-builder/games/sentence-scramble",
        status: "studio_interim",
      },
      {
        id: "fill-blanks",
        title: "Fill in the blanks",
        description: "Cloze gaps with optional word banks.",
        badge: "Quizzes",
        studioPath: "/activity-builder/games/fill-blanks",
        status: "studio_interim",
      },
      {
        id: "drag-match",
        title: "Drag match",
        description: "Tap word, then box to match pairs.",
        badge: "Quizzes",
        studioPath: "/activity-builder/games/drag-match",
        status: "studio_interim",
      },
      {
        id: "line-match",
        title: "Line match",
        description: "Draw lines between pair columns.",
        badge: "Quizzes",
        studioPath: "/activity-builder/games/line-match",
        status: "studio_interim",
      },
    ],
  },
  {
    id: "scene",
    label: "3 · Scene & listening",
    toneClass: "text-violet-800",
    cards: [
      {
        id: "hotspots",
        title: "Explore hotspots",
        description: "Tap targets on a scene — feeds the track compiler.",
        badge: "Scene",
        lpPath: "/hotspots",
        status: "authoring_ready",
        bankFormats: ["explore_hotspots"],
      },
      {
        id: "language-in-focus",
        title: "Language in Focus",
        description: "Guided grammar patterns — feeds the track compiler.",
        badge: "Scene",
        studioPath: "/activity-builder/language-in-focus",
        status: "studio_interim",
      },
      {
        id: "listen-and-choose",
        title: "Listen and choose",
        description: "Dialog → pick 1 of 3 pictures — feeds the track compiler.",
        badge: "Scene",
        studioPath: "/activity-builder/games/listen-and-choose",
        status: "studio_interim",
      },
    ],
  },
  {
    id: "compiler",
    label: "4 · Learning Track Compiler",
    toneClass: "text-fuchsia-800",
    cards: [
      {
        id: "learning-tracks",
        title: "Learning Track Compiler",
        description:
          "Assemble vocab quizzes + scene activities into a timed self-study track.",
        badge: "Compiler",
        lpPath: "/learning-tracks",
        studioPath: "/activity-builder/learning-tracks",
        status: "authoring_ready",
        bankFormats: ["learning_track"],
      },
    ],
  },
];

export function studioOriginFromEnv(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_STUDIO_ORIGIN?.trim() ||
    process.env.STUDIO_ORIGIN?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/** Cards teachers can use without admin (live LP authoring). */
export function isShippableActivityBuilderCard(card: ActivityBuilderCard): boolean {
  return card.status === "authoring_ready" || card.status === "play_in_bank";
}

/**
 * Hub sections for the signed-in teacher.
 * Non-admins only see shippable cards; empty sections are omitted.
 */
export function visibleActivityBuilderSections(
  isAdmin: boolean,
): ActivityBuilderSection[] {
  if (isAdmin) return ACTIVITY_BUILDER_SECTIONS;
  return ACTIVITY_BUILDER_SECTIONS.map((section) => ({
    ...section,
    cards: section.cards.filter(isShippableActivityBuilderCard),
  })).filter((section) => section.cards.length > 0);
}
