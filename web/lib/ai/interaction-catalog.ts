/**
 * Full player-supported catalog for `interaction` subtypes.
 * Keep in sync with `interactionPayloadSchema` and `rawInteractionTemplateForSubtype`.
 *
 * Do not use this full list for Story-First Blueprint generation. It intentionally
 * includes legacy/experimental activities that the runtime can still play.
 */
export const AI_INTERACTION_SUBTYPES = [
  "mc_quiz",
  "true_false",
  "short_answer",
  "fill_blanks",
  "fix_text",
  "click_targets",
  "hotspot_info",
  "hotspot_gate",
  "drag_match",
  "drag_sentence",
  "sound_sort",
  "listen_hotspot_sequence",
  "listen_color_write",
  "letter_mixup",
  "word_shape_hunt",
  "table_complete",
  "sorting_game",
  "essay",
  "voice_question",
  "guided_dialogue",
] as const;

export type AiInteractionSubtype = (typeof AI_INTERACTION_SUBTYPES)[number];

const SUBTYPE_SET = new Set<string>(AI_INTERACTION_SUBTYPES);

/**
 * Production-safe reinforcement activities for Story-First Blueprint generation.
 * Story remains the core lesson engine; these interactions may only reinforce
 * language already introduced in a specific story beat.
 */
export const STORY_FIRST_REINFORCEMENT_SUBTYPES = [
  "mc_quiz",
  "true_false",
  "fill_blanks",
  "fix_text",
  "letter_mixup",
] as const;

export type StoryFirstReinforcementSubtype =
  (typeof STORY_FIRST_REINFORCEMENT_SUBTYPES)[number];

const STORY_FIRST_REINFORCEMENT_SET = new Set<string>(
  STORY_FIRST_REINFORCEMENT_SUBTYPES,
);

export function normalizeInteractionSubtypeForAi(raw: string): AiInteractionSubtype {
  const s = raw.trim().toLowerCase();
  if (SUBTYPE_SET.has(s)) return s as AiInteractionSubtype;
  return "mc_quiz";
}

export function isStoryFirstReinforcementSubtype(
  raw: string | null | undefined,
): raw is StoryFirstReinforcementSubtype {
  if (!raw) return false;
  return STORY_FIRST_REINFORCEMENT_SET.has(raw.trim().toLowerCase());
}

export function normalizeStoryFirstReinforcementSubtypeForAi(
  raw: string,
): StoryFirstReinforcementSubtype {
  const s = raw.trim().toLowerCase();
  if (STORY_FIRST_REINFORCEMENT_SET.has(s)) {
    return s as StoryFirstReinforcementSubtype;
  }
  return "mc_quiz";
}

/** Full prompt block for legacy screenOutline / quizGroups materialization. */
export function legacyInteractionCatalogPromptSnippet(): string {
  return `Quiz interaction subtypes (pick one per question; use exact subtype string):
- mc_quiz: multiple choice; question, options[{id,label}], correct_option_id
- true_false: statement, correct boolean
- short_answer: prompt, acceptable_answers string[]
- fill_blanks: template with __1__, __2__; blanks[{id, acceptable[]}]
- fix_text: broken_text, acceptable string[]
- click_targets: image_url, body_text, targets[{id,x_percent,y_percent,w_percent,h_percent,label}], correct_target_id or treasure_target_ids[]
- hotspot_info / hotspot_gate: image_url, hotspots or targets, body_text
- drag_match: zones[], tokens[], correct_map tokenId->zoneId
- drag_sentence: sentence_slots, word_bank, correct_order
- sound_sort / listen_* : prompt_audio_url + choices or targets (use placehold audio if needed)
- letter_mixup, word_shape_hunt, table_complete, sorting_game: see templates
- essay, voice_question, guided_dialogue: richer speaking/writing (use when level fits)

Prefer mc_quiz, true_false, short_answer, fill_blanks, fix_text, click_targets for young learners unless the outline specifies otherwise.`;
}

/** Short prompt block for Story-First Blueprint reinforcement materialization. */
export function storyFirstReinforcementPromptSnippet(): string {
  return `Story-First reinforcement activity subtypes (use exact subtype string; attach every activity to a specific story beat):
- mc_quiz: multiple choice; question, options[{id,label}], correct_option_id
- true_false: statement, correct boolean
- fill_blanks: template with __1__, __2__; blanks[{id, acceptable[]}]
- fix_text: broken_text, acceptable string[]
- letter_mixup: prompt, items[{id,target_word,accepted_words?,hint?}]

Rules:
- Use story as the primary lesson delivery system.
- Use only the five subtypes listed above for generated reinforcement.
- Every reinforcement activity must check or strengthen language already introduced in its attached story beat.
- Do not generate legacy/experimental subtypes for Story-First Blueprints.`;
}

/** @deprecated Choose a boundary-specific helper instead. */
export function interactionCatalogPromptSnippet(): string {
  return storyFirstReinforcementPromptSnippet();
}
