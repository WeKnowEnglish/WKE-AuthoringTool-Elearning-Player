import type { ActivityTrackPartKind } from "@/lib/activity-tracks/types";
import type { LearningTrackBeatKind } from "@/lib/learning-tracks/composition-types";

/** The six language-learning strands used to organize Track builder activities. */
export const ACTIVITY_SKILL_TYPES = [
  "vocabulary",
  "grammar",
  "speaking",
  "listening",
  "reading",
  "writing",
] as const;

export type ActivitySkillType = (typeof ACTIVITY_SKILL_TYPES)[number];

export const ACTIVITY_SKILL_LABELS: Record<ActivitySkillType, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  speaking: "Speaking",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
};

/** Primary learning purpose for each Practice-mode activity. */
export const LEARNING_TRACK_BEAT_SKILLS: Record<
  LearningTrackBeatKind,
  ActivitySkillType
> = {
  presentation: "reading",
  explore_hotspots: "reading",
  language_in_focus: "grammar",
  flashcards: "vocabulary",
  listening_item_match: "listening",
  listen_and_choose: "listening",
  multiple_choice: "reading",
  letter_mixup: "vocabulary",
  line_match: "vocabulary",
  true_false: "reading",
  sentence_scramble: "grammar",
  fill_blanks: "grammar",
  wordsearch: "vocabulary",
  crossword: "vocabulary",
  memory: "vocabulary",
};

/** Primary learning purpose for each Graded-mode activity. */
export const ACTIVITY_TRACK_PART_SKILLS: Record<
  ActivityTrackPartKind,
  ActivitySkillType
> = {
  multiple_choice: "reading",
  flashcards: "vocabulary",
  fill_blanks: "grammar",
  listen_and_choose: "listening",
  listening_item_match: "listening",
  line_match: "vocabulary",
  true_false: "reading",
  sentence_scramble: "grammar",
  letter_mixup: "vocabulary",
  wordsearch: "vocabulary",
  crossword: "vocabulary",
  memory: "vocabulary",
  read_and_answer: "reading",
  cloze_choice: "reading",
  cloze_open: "reading",
  definition_match: "vocabulary",
  picture_story: "reading",
  explore_hotspots: "reading",
  picture_cloze: "grammar",
  word_annotation: "grammar",
  sentence_columns: "grammar",
  verb_table: "grammar",
  picture_writing: "writing",
  question_writing: "writing",
  writing_prompt: "writing",
  creative_presentation: "speaking",
  free_response: "writing",
  speaking_prompt: "speaking",
  secondary_sequence: "reading",
  secondary_corrections: "grammar",
  secondary_dialogue: "grammar",
  secondary_questions: "grammar",
};

export type SkillGroupedActivityOption<Id extends string> = {
  id: Id;
  label: string;
  description?: string;
  skill: ActivitySkillType;
};

export function groupActivityOptionsBySkill<Id extends string>(
  options: readonly SkillGroupedActivityOption<Id>[],
) {
  return ACTIVITY_SKILL_TYPES.map((skill) => ({
    skill,
    label: ACTIVITY_SKILL_LABELS[skill],
    options: options.filter((option) => option.skill === skill),
  }));
}
