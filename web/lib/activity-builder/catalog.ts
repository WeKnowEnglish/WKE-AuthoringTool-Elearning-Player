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
   * When true, only platform admins see this card on the Activity Builder hub.
   * Use for legacy backups and individual format workspaces — teachers use the
   * deep hubs (Quiz builder, vocab lists, hotspots, LTC, library) instead.
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
      // Individual format workspaces — admin hub only; teachers use Quiz builder / deep hubs.
      {
        id: "picture-cloze",
        title: "Picture cloze",
        description:
          "Picture + sentence gap from a vocab list. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/picture-cloze",
        status: "authoring_ready",
        bankFormats: ["picture_cloze"],
        adminOnly: true,
      },
      {
        id: "verb-table",
        title: "Verb table",
        description:
          "Base / past / participle gaps from verb lemmas. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/verb-table",
        status: "authoring_ready",
        bankFormats: ["verb_table"],
        adminOnly: true,
      },
      {
        id: "sentence-columns",
        title: "Sentence columns",
        description:
          "Who / Action / Extra placement challenges. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/sentence-columns",
        status: "authoring_ready",
        bankFormats: ["sentence_columns"],
        adminOnly: true,
      },
      {
        id: "word-annotation",
        title: "Word annotation",
        description:
          "Circle adjectives and underline adverbs. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/word-annotation",
        status: "authoring_ready",
        bankFormats: ["word_annotation"],
        adminOnly: true,
      },
      {
        id: "picture-writing",
        title: "Picture writing",
        description:
          "Write sentences from pictures with checklist readiness. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/picture-writing",
        status: "authoring_ready",
        bankFormats: ["picture_writing"],
        adminOnly: true,
      },
      {
        id: "question-writing",
        title: "Question writing",
        description:
          "Form questions from prompts with structure checks. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/question-writing",
        status: "authoring_ready",
        bankFormats: ["question_writing"],
        adminOnly: true,
      },
      {
        id: "definition-match",
        title: "Definition match",
        description:
          "Match words to child-friendly definitions from a vocab list. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/definition-match",
        status: "authoring_ready",
        bankFormats: ["definition_match"],
        adminOnly: true,
      },
      {
        id: "cloze-choice",
        title: "Cloze with choices",
        description:
          "Complete passage gaps with multiple-choice options. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/cloze-choice",
        status: "authoring_ready",
        bankFormats: ["cloze_choice"],
        adminOnly: true,
      },
      {
        id: "cloze-open",
        title: "Open cloze",
        description:
          "Type missing passage words without choices. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/cloze-open",
        status: "authoring_ready",
        bankFormats: ["cloze_open"],
        adminOnly: true,
      },
      {
        id: "read-and-answer",
        title: "Read and answer",
        description:
          "Read a short passage and answer comprehension questions. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/read-and-answer",
        status: "authoring_ready",
        bankFormats: ["read_and_answer"],
        adminOnly: true,
      },
      {
        id: "picture-story",
        title: "Picture story",
        description:
          "Follow a story through pictures, then answer questions. Assign as homework (dedicated player, not Lesson Player).",
        badge: "Homework",
        lpPath: "/picture-story",
        status: "authoring_ready",
        bankFormats: ["picture_story"],
        adminOnly: true,
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
        studioPath: "/pilots/language-in-focus",
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
  {
    id: "reading",
    label: "5 · Reading",
    toneClass: "text-emerald-800",
    cards: [
      {
        id: "reading-definition-match",
        title: "Definition Match",
        description:
          "Moved to Quizzes · Homework — bankable definition match with vocab compile. Same studio: /teacher/activity-builder/definition-match.",
        badge: "Homework",
        lpPath: "/definition-match",
        status: "authoring_ready",
        bankFormats: ["definition_match"],
        adminOnly: true,
      },
      {
        id: "reading-read-and-answer",
        title: "Read and Answer",
        description:
          "Moved to Quizzes · Homework — bankable read and answer. Same studio: /teacher/activity-builder/read-and-answer.",
        badge: "Homework",
        lpPath: "/read-and-answer",
        status: "authoring_ready",
        bankFormats: ["read_and_answer"],
        adminOnly: true,
      },
      {
        id: "reading-cloze-choice",
        title: "Cloze with Choices",
        description:
          "Moved to Quizzes · Homework — bankable cloze with choices. Same studio: /teacher/activity-builder/cloze-choice.",
        badge: "Homework",
        lpPath: "/cloze-choice",
        status: "authoring_ready",
        bankFormats: ["cloze_choice"],
        adminOnly: true,
      },
      {
        id: "reading-cloze-open",
        title: "Open Cloze",
        description:
          "Moved to Quizzes · Homework — bankable open cloze. Same studio: /teacher/activity-builder/cloze-open.",
        badge: "Homework",
        lpPath: "/cloze-open",
        status: "authoring_ready",
        bankFormats: ["cloze_open"],
        adminOnly: true,
      },
      {
        id: "reading-picture-story",
        title: "Picture Story Reading",
        description:
          "Moved to Quizzes · Homework — bankable picture story. Same studio: /teacher/activity-builder/picture-story.",
        badge: "Homework",
        lpPath: "/picture-story",
        status: "authoring_ready",
        bankFormats: ["picture_story"],
        adminOnly: true,
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
