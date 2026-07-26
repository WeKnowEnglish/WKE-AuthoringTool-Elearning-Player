/**
 * Manual registry for the /pilots index — triage board for pilots, orphans, and deferred work.
 * Keep in sync when adding `/app/pilots/...` pages or discovering salvageable surfaces.
 */

export type PilotStatus = "active" | "review";

export type PilotGroup =
  | "games"
  | "activities"
  | "standalone"
  | "authoring"
  | "experiments"
  | "deferred"
  | "salvageable"
  | "pet_minigames"
  | "classroom"
  | "grammar_product"
  | "dead";

export type PilotEntry = {
  /**
   * Closest live URL — may be a teaser, redirect, or partial surface.
   * Omit when there is no pilot/route yet.
   */
  href?: string;
  title: string;
  description: string;
  group: PilotGroup;
  status: PilotStatus;
  /** Matching EDU Studio authoring route, when one exists. */
  studioHref?: string;
  /** When true, Open is a triage link only — not a shippable product entry. */
  notShippable?: boolean;
  /** LessonPlayer interaction / story subtype id when this card is a schema orphan. */
  subtype?: string;
};

/** Page sections — order is display order. Each has a purpose blurb for triage. */
export type PilotSectionId =
  | "active_games"
  | "active_activities"
  | "review_standalone"
  | "review_authoring"
  | "review_experiments"
  | "deferred_worlds"
  | "salvageable_subtypes"
  | "pet_minigames"
  | "classroom"
  | "grammar_product"
  | "dead";

export type PilotSectionDef = {
  id: PilotSectionId;
  title: string;
  purpose: string;
  groups: PilotGroup[];
  /** Visual tone for the section header rule. */
  tone: "active" | "review" | "deferred" | "salvageable" | "product" | "dead";
};

export const PILOT_SECTIONS: PilotSectionDef[] = [
  {
    id: "active_games",
    title: "Active · Quizzes",
    purpose:
      "Current Studio ↔ Lesson Player Quiz formats. These are the formats we are shipping through Activity Builder + pilots.",
    groups: ["games"],
    tone: "active",
  },
  {
    id: "active_activities",
    title: "Active · Core activities",
    purpose:
      "Non-quiz activity formats with Studio authoring and a live Lesson Player pilot.",
    groups: ["activities"],
    tone: "active",
  },
  {
    id: "review_standalone",
    title: "Review · Standalone games",
    purpose:
      "Playable game surfaces that live outside Primary / Secondary portals. Decide: productize into a portal, keep as teacher tools, or archive.",
    groups: ["standalone"],
    tone: "review",
  },
  {
    id: "review_authoring",
    title: "Review · Authoring labs",
    purpose:
      "Tuning / guest authoring tools that support art or classroom experiments — not student curriculum paths.",
    groups: ["authoring"],
    tone: "review",
  },
  {
    id: "review_experiments",
    title: "Review · Experiments",
    purpose:
      "Architecture or content experiments still reachable as pilots. Promote, fold into Active, or archive.",
    groups: ["experiments"],
    tone: "review",
  },
  {
    id: "deferred_worlds",
    title: "Deferred · Live / world intentions",
    purpose:
      "Large live or world systems that are not curriculum-shippable yet. Lots of code may remain; entry points are teasers or sandboxes.",
    groups: ["deferred"],
    tone: "deferred",
  },
  {
    id: "salvageable_subtypes",
    title: "Old but salvageable · LessonPlayer subtypes",
    purpose:
      "Interaction (or story) subtypes that still have schema + views, but no dedicated Quiz / Activity Builder pilot. Keep, wrap as a Quiz format, or archive the view.",
    groups: ["salvageable"],
    tone: "salvageable",
  },
  {
    id: "pet_minigames",
    title: "Pet mini-games",
    purpose:
      "Mini-games inside Primary Pet Care. Reachable from Primary Games → Pet, not as standalone pilots. Triage per mini-game if we keep or cut them.",
    groups: ["pet_minigames"],
    tone: "product",
  },
  {
    id: "classroom",
    title: "Classroom & collab tools",
    purpose:
      "Teacher/student live classroom surfaces (whiteboard, virtual classroom, word cards, live-game editor). Product-ish, separate from Games pilots.",
    groups: ["classroom"],
    tone: "product",
  },
  {
    id: "grammar_product",
    title: "Grammar product",
    purpose:
      "Student grammar posters and teacher grammar authoring — shipped/partial product path, not a Games pilot.",
    groups: ["grammar_product"],
    tone: "product",
  },
  {
    id: "dead",
    title: "Dead / redirects",
    purpose:
      "Routes that redirect or 404 on purpose. Listed so we do not mistake them for live pilots when cleaning bookmarks and links.",
    groups: ["dead"],
    tone: "dead",
  },
];

export const PILOT_CATALOG: PilotEntry[] = [
  // ── Active · Quizzes ──────────────────────────────────────────────
  {
    href: "/pilots/games-mc-quiz",
    title: "Multiple choice",
    description: "Studio Quiz MC packs play as Lesson Player mc_quiz screens.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games",
  },
  {
    href: "/pilots/games-listen-choose",
    title: "Listen and choose",
    description: "Dialog audio or TTS, then pick the matching picture.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games/listen-and-choose",
  },
  {
    href: "/pilots/games-flashcards",
    title: "Flashcards",
    description: "Flip decks with word, example, definition, picture, and audio.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games/flashcards",
  },
  {
    href: "/pilots/games-letter-mixup",
    title: "Letter scramble",
    description: "Unscramble letters to spell target words.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games/letter-mixup",
  },
  {
    href: "/pilots/games-sentence-scramble",
    title: "Sentence scramble",
    description: "Rebuild sentences from a scrambled word bank.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games/sentence-scramble",
  },
  {
    href: "/pilots/games-fill-blanks",
    title: "Fill in the blanks",
    description: "Cloze with __1__ gaps, acceptable answers, and word banks.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games/fill-blanks",
  },
  {
    href: "/pilots/games-drag-match",
    title: "Drag match",
    description: "Tap a word, then tap a box to match pairs.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games/drag-match",
  },
  {
    href: "/pilots/games-line-match",
    title: "Line match",
    description: "Same pair model as drag match — draw lines between columns.",
    group: "games",
    status: "active",
    studioHref: "/activity-builder/games/line-match",
  },

  // ── Active · Core activities ────────────────────────────────────
  {
    href: "/pilots/language-in-focus",
    title: "Language in Focus",
    description: "Guided pattern practice with scene, tabs, and sentence build.",
    group: "activities",
    status: "active",
    studioHref: "/activity-builder/language-in-focus",
  },
  {
    href: "/pilots/explore-hotspots",
    title: "Explore hotspots",
    description:
      "Tap targets on a scene for listening and vocabulary discovery. Author in Lesson Player Activity Builder.",
    group: "activities",
    status: "active",
    studioHref: "/teacher/activity-builder/hotspots",
  },
  {
    href: "/pilots/activity-intro",
    title: "Activity intro",
    description:
      "StoryBook-based activity intro. Track bridges now use post_quiz_report; keep or fold this intro elsewhere.",
    group: "experiments",
    status: "review",
  },
  {
    href: "/pilots/learning-track",
    title: "Learning track",
    description:
      "Compiled self-study sessions (hobbies Day 1) with timeline authoring and live preview.",
    group: "activities",
    status: "active",
    studioHref: "/teacher/activity-builder/learning-tracks",
  },
  {
    href: "/pilots/learning-track",
    title: "Post-quiz report bridge",
    description:
      "Replaces StoryBook for track transitions: results, encouragement, and next-activity cue from the Learning Track Compiler.",
    group: "activities",
    status: "active",
    studioHref: "/teacher/activity-builder/learning-tracks",
    subtype: "post_quiz_report",
  },
  {
    href: "/pilots/self-study",
    title: "Self-study packs",
    description: "Catalog shell — superseded by Learning track pilot for V1 play.",
    group: "experiments",
    status: "review",
  },

  // ── Review · Standalone ─────────────────────────────────────────
  {
    href: "/board-game",
    title: "Board game (local)",
    description:
      "Classroom board game with setup, play, and built-in map builder. Not linked from Primary/Secondary.",
    group: "standalone",
    status: "review",
  },
  {
    href: "/board-game/multiplayer",
    title: "Board game (multiplayer)",
    description: "Liveblocks lobby / host / join flow for the same board game.",
    group: "standalone",
    status: "review",
  },
  {
    href: "/live-game",
    title: "Live game · English Craft",
    description:
      "Team adventure live game (host/join). Product-shaped landing, separate from Primary/Secondary portals.",
    group: "standalone",
    status: "review",
  },
  {
    href: "/teststartpage",
    title: "Test start page (vocab sandbox)",
    description:
      "Older vocab topic/quiz sandbox. Primary still reuses pieces of it for self-study overlays.",
    group: "standalone",
    status: "review",
  },
  {
    href: "/activity/sentence-strip/join",
    title: "Sentence strip",
    description: "Collaborative sentence-strip session join — classroom activity outside portals.",
    group: "standalone",
    status: "review",
  },

  // ── Review · Authoring labs ─────────────────────────────────────
  {
    href: "/grammar/pilot/layouts",
    title: "Grammar layout lab",
    description: "Dev-only grammar poster layout demos (404 in production).",
    group: "authoring",
    status: "review",
  },
  {
    href: "/pilots/topdown-sprites",
    title: "Top-down sprites",
    description:
      "Sprite / terrain / letter-fruit tuning lab — feeds board-game & garden art.",
    group: "authoring",
    status: "review",
  },
  {
    href: "/pilots/whiteboard",
    title: "Whiteboard (guest pilot)",
    description: "Guest whiteboard pilot landing. Production routes listed under Classroom.",
    group: "authoring",
    status: "review",
  },

  // ── Review · Experiments ────────────────────────────────────────
  {
    href: "/pilots/daily-bakery-quest",
    title: "Daily bakery quest",
    description: "Learning-loop architecture test for the bakery quest flow.",
    group: "experiments",
    status: "review",
  },

  // ── Deferred · worlds ───────────────────────────────────────────
  {
    href: "/primary?nav=games",
    title: "World explore (Simple World)",
    description:
      "WORLD_1_SIMPLE + explore areas + StudentHub HomeRoom. /home redirects to Primary; Games tab only teases “coming soon.”",
    group: "deferred",
    status: "review",
    notShippable: true,
  },
  {
    href: "/primary?nav=games",
    title: "Language Garden",
    description:
      "On Primary Games when unlocked. Meta-game planting/harvest; audit: disconnected from mastery evidence.",
    group: "deferred",
    status: "review",
    notShippable: true,
  },
  {
    href: "/teststartpage",
    title: "Chase game",
    description:
      "Platform chase mini-game inside the vocab sandbox. Quest IDs still reference chase wins/levels.",
    group: "deferred",
    status: "review",
    notShippable: true,
  },
  {
    href: "/pilots/daily-bakery-quest",
    title: "Explorer learning loop (bakery quest)",
    description:
      "Golden-reference 2D explorer as lesson driver. Architecture pilot only.",
    group: "deferred",
    status: "review",
    notShippable: true,
  },

  // ── Old but salvageable · LessonPlayer subtypes ─────────────────
  {
    title: "Explore (2D roam)",
    description:
      "LessonPlayer subtype explore — roam scenes / gates. Related to world explore. View: ExploreRunView.",
    group: "salvageable",
    status: "review",
    subtype: "explore",
  },
  {
    title: "Word bucket catch",
    description: "Falling-word catch mini-game. View: WordBucketCatchView.",
    group: "salvageable",
    status: "review",
    subtype: "word_bucket_catch",
  },
  {
    title: "Guided dialogue",
    description: "Turn-taking dialogue practice. View: GuidedDialogueView.",
    group: "salvageable",
    status: "review",
    subtype: "guided_dialogue",
  },
  {
    title: "Sound sort",
    description: "Listen to prompt audio, choose the matching picture. View: SoundSortView.",
    group: "salvageable",
    status: "review",
    subtype: "sound_sort",
  },
  {
    title: "Sorting game",
    description: "Sort objects into containers. View: SortingGameView.",
    group: "salvageable",
    status: "review",
    subtype: "sorting_game",
  },
  {
    title: "Word shape hunt",
    description: "Find words by shape / outline. View: WordShapeHuntView.",
    group: "salvageable",
    status: "review",
    subtype: "word_shape_hunt",
  },
  {
    title: "Table complete",
    description: "Fill cells in a table. View: TableCompleteView.",
    group: "salvageable",
    status: "review",
    subtype: "table_complete",
  },
  {
    title: "Click targets",
    description: "Tap correct hotspot(s) on an image. View: ClickTargetsView.",
    group: "salvageable",
    status: "review",
    subtype: "click_targets",
  },
  {
    title: "Listen, color, write",
    description: "Listen then color / write response. View: ListenColorWriteView.",
    group: "salvageable",
    status: "review",
    subtype: "listen_color_write",
  },
  {
    title: "True / False",
    description: "Classic T/F quiz. View: TrueFalseView. No Quiz pack pilot.",
    group: "salvageable",
    status: "review",
    subtype: "true_false",
  },
  {
    title: "Short answer",
    description: "Typed short answer with acceptable answers. View: ShortAnswerView.",
    group: "salvageable",
    status: "review",
    subtype: "short_answer",
  },
  {
    title: "Fix text",
    description: "Find and fix errors in a sentence. View: FixTextView.",
    group: "salvageable",
    status: "review",
    subtype: "fix_text",
  },
  {
    title: "Essay",
    description: "Longer writing with keyword feedback. View: EssayView.",
    group: "salvageable",
    status: "review",
    subtype: "essay",
  },
  {
    title: "Voice question",
    description: "Speak / record an answer. View: VoiceQuestionView.",
    group: "salvageable",
    status: "review",
    subtype: "voice_question",
  },
  {
    title: "StoryBook",
    description:
      "Legacy story screen type (StoryBookView). Firmly replaced for learning-track transitions by post_quiz_report; schema + view remain for vocab/learn and other leftover story payloads.",
    group: "salvageable",
    status: "review",
    subtype: "story",
  },
  {
    title: "Story-page drag match",
    description:
      "StoryBook phase kind drag_match — salvageable with StoryBook. Not Quiz subtype drag_match.",
    group: "salvageable",
    status: "review",
    subtype: "story.drag_match",
  },

  // ── Pet mini-games ──────────────────────────────────────────────
  {
    href: "/primary?nav=games",
    title: "Pet care (hub)",
    description: "Primary Games → Pet. Care loop + entry to the mini-games below.",
    group: "pet_minigames",
    status: "review",
  },
  {
    href: "/primary?nav=games",
    title: "Pet memory match",
    description: "Flip-card memory mini-game. components/pet-memory.",
    group: "pet_minigames",
    status: "review",
  },
  {
    href: "/primary?nav=games",
    title: "Pet scrabble",
    description: "Letter-tile spelling mini-game. components/pet-scrabble.",
    group: "pet_minigames",
    status: "review",
  },
  {
    href: "/primary?nav=games",
    title: "Pet sandwich",
    description: "Build a sandwich from word ingredients. components/pet-sandwich.",
    group: "pet_minigames",
    status: "review",
  },
  {
    href: "/primary?nav=games",
    title: "Pet blender / drink",
    description: "Mix a drink from fruit/word ingredients. components/pet-blender.",
    group: "pet_minigames",
    status: "review",
  },
  {
    href: "/primary?nav=games",
    title: "Pet exercise",
    description: "Climb / exercise word activity. components/pet-exercise.",
    group: "pet_minigames",
    status: "review",
  },

  // ── Classroom & collab ──────────────────────────────────────────
  {
    href: "/whiteboard/join",
    title: "Whiteboard (production join)",
    description: "Student/guest join for collaborative whiteboard sessions.",
    group: "classroom",
    status: "review",
  },
  {
    href: "/virtual-classroom/join",
    title: "Virtual classroom",
    description: "Live virtual classroom join / session surface.",
    group: "classroom",
    status: "review",
  },
  {
    href: "/teacher/word-packs",
    title: "Word cards / word packs (salvageable)",
    description:
      "Removed from teacher primary nav — routes kept. Teacher packs at /teacher/word-packs; students join at /word-cards/[joinCode]. Prefer Activity Builder vocabulary lists.",
    group: "salvageable",
    status: "review",
    notShippable: true,
  },
  {
    href: "/teacher/dictionary/review",
    title: "Teacher dictionary / lexicon review",
    description:
      "Lexicon review remains under Media in the teacher header. This pilots card preserves the dictionary surface for triage.",
    group: "salvageable",
    status: "review",
  },
  {
    href: "/live-game",
    title: "Live-game question sets",
    description:
      "Teacher edits published sets at /live-game/question-sets/[id]/edit from the live-game host flow.",
    group: "classroom",
    status: "review",
  },
  {
    href: "/teacher",
    title: "Whiteboard teacher review",
    description:
      "Round review lives at /teacher/whiteboard/review/[roundId] (open Teacher hub, then a review link).",
    group: "classroom",
    status: "review",
  },

  // ── Grammar product ─────────────────────────────────────────────
  {
    href: "/grammar",
    title: "Grammar posters (student)",
    description: "Public/student grammar poster catalog and slug pages.",
    group: "grammar_product",
    status: "review",
  },
  {
    href: "/teacher/grammar",
    title: "Grammar editor (teacher)",
    description: "Teacher grammar module authoring index.",
    group: "grammar_product",
    status: "review",
  },

  // ── Dead / redirects ───────────────────────────────────────────
  {
    href: "/home",
    title: "/home",
    description: "Legacy world hub — redirects to /primary (or Primary Games for ?collection=games).",
    group: "dead",
    status: "review",
  },
  {
    href: "/learn",
    title: "/learn",
    description: "Familiar Learn entry — redirects to /primary.",
    group: "dead",
    status: "review",
  },
  {
    href: "/activities",
    title: "/activities",
    description: "Archived activity library — returns notFound.",
    group: "dead",
    status: "review",
  },
  {
    href: "/testprimary",
    title: "/testprimary",
    description: "Retired primary sandbox — redirects/retired notice.",
    group: "dead",
    status: "review",
  },
];

export function pilotsByGroup(
  entries: readonly PilotEntry[],
  group: PilotGroup,
): PilotEntry[] {
  return entries.filter((entry) => entry.group === group);
}

export function entriesForSection(section: PilotSectionDef): PilotEntry[] {
  return PILOT_CATALOG.filter((entry) => section.groups.includes(entry.group));
}
