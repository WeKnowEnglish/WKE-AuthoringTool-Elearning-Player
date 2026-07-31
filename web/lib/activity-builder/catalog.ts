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
  /**
   * When true, only platform admins see this card (legacy / backup entry points).
   * Non-admins never see these even if status is authoring_ready.
   */
  adminOnly?: boolean;
};

export type ActivityBuilderSection = {
  id: string;
  label: string;
  toneClass: string;
  cards: ActivityBuilderCard[];
};

export const ACTIVITY_BUILDER_SECTIONS: ActivityBuilderSection[] = [
  {
    id: "library",
    label: "0 · WKE Library",
    toneClass: "text-teal-800",
    cards: [
      {
        id: "wke-library",
        title: "WKE Library",
        description:
          "Curated starters and teacher contributions you can copy into My Activity Bank. Private class work stays private.",
        badge: "Library",
        lpPath: "/library",
        status: "authoring_ready",
      },
    ],
  },
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
    label: "2 · Quizzes",
    toneClass: "text-amber-800",
    cards: [
      {
        id: "quiz-builder",
        title: "Quiz builder",
        description:
          "Generate from a vocabulary list, edit questions, then save to Activity Bank.",
        badge: "Quizzes",
        lpPath: "/quizzes",
        status: "authoring_ready",
        bankFormats: ["multiple_choice", "letter_mixup", "flashcards"],
      },
      // Legacy backup entry points (admin only) — pre–unified Quiz Builder.
      {
        id: "multiple-choice",
        title: "Multiple choice (legacy)",
        description:
          "Backup: open Vocabulary lists and compile MCQ from there.",
        badge: "Legacy",
        lpPath: "/vocabulary-lists",
        studioPath: "/activity-builder/games",
        status: "authoring_ready",
        bankFormats: ["multiple_choice"],
        adminOnly: true,
      },
      {
        id: "flashcards",
        title: "Flashcards (legacy)",
        description:
          "Backup: open Vocabulary lists and compile flashcards from there.",
        badge: "Legacy",
        lpPath: "/vocabulary-lists",
        studioPath: "/activity-builder/games/flashcards",
        status: "authoring_ready",
        bankFormats: ["flashcards"],
        adminOnly: true,
      },
      {
        id: "letter-mixup",
        title: "Letter scramble (legacy)",
        description:
          "Backup: open Vocabulary lists and compile letter scramble from there.",
        badge: "Legacy",
        lpPath: "/vocabulary-lists",
        studioPath: "/activity-builder/games/letter-mixup",
        status: "authoring_ready",
        bankFormats: ["letter_mixup"],
        adminOnly: true,
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
 * Non-admins only see shippable, non-adminOnly cards; empty sections are omitted.
 */
export function visibleActivityBuilderSections(
  isAdmin: boolean,
): ActivityBuilderSection[] {
  return ACTIVITY_BUILDER_SECTIONS.map((section) => ({
    ...section,
    cards: section.cards.filter((card) => {
      if (card.adminOnly && !isAdmin) return false;
      if (!isAdmin && !isShippableActivityBuilderCard(card)) return false;
      return true;
    }),
  })).filter((section) => section.cards.length > 0);
}
