import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/** Pilot play URL for a durable Activity Bank row (wired in a later slice). */
export function playPathForStudioActivity(
  format: StudioActivityFormat,
  id: string,
): string {
  const q = `activity=${encodeURIComponent(id)}`;
  if (format === "multiple_choice") return `/pilots/games-mc-quiz?${q}`;
  if (format === "letter_mixup") return `/pilots/games-letter-mixup?${q}`;
  if (format === "flashcards") return `/pilots/games-flashcards?${q}`;
  if (format === "listen_and_choose") return `/pilots/games-listen-choose?${q}`;
  if (format === "line_match") return `/pilots/games-line-match?${q}`;
  if (format === "sentence_scramble") return `/pilots/games-sentence-scramble?${q}`;
  if (format === "fill_blanks") return `/pilots/games-fill-blanks?${q}`;
  if (format === "true_false") return `/pilots/games-true-false?${q}`;
  if (format === "learning_track") return `/pilots/learning-track?${q}`;
  if (format === "vocabulary_list") {
    return `/teacher/activity-builder/vocabulary-lists?activity=${encodeURIComponent(id)}`;
  }
  if (format === "explore_hotspots") {
    return `/teacher/activity-builder/hotspots?activity=${encodeURIComponent(id)}`;
  }
  if (format === "picture_cloze") {
    return `/pilots/picture-cloze?activity=${encodeURIComponent(id)}`;
  }
  if (format === "verb_table") {
    return `/pilots/verb-table?activity=${encodeURIComponent(id)}`;
  }
  if (format === "sentence_columns") {
    return `/pilots/sentence-columns?activity=${encodeURIComponent(id)}`;
  }
  if (format === "word_annotation") {
    return `/pilots/word-annotation?activity=${encodeURIComponent(id)}`;
  }
  if (format === "picture_writing") {
    return `/pilots/picture-writing?activity=${encodeURIComponent(id)}`;
  }
  if (format === "question_writing") {
    return `/pilots/question-writing?activity=${encodeURIComponent(id)}`;
  }
  if (format === "definition_match") {
    return `/pilots/definition-match?activity=${encodeURIComponent(id)}`;
  }
  if (format === "cloze_choice") {
    return `/pilots/cloze-choice?activity=${encodeURIComponent(id)}`;
  }
  if (format === "cloze_open") {
    return `/pilots/cloze-open?activity=${encodeURIComponent(id)}`;
  }
  if (format === "read_and_answer") {
    return `/pilots/read-and-answer?activity=${encodeURIComponent(id)}`;
  }
  if (format === "picture_story") {
    return `/pilots/picture-story?activity=${encodeURIComponent(id)}`;
  }
  return `/pilots?${q}`;
}

/** Teacher classes surface with bank focus (UI wired in a later slice). */
export function bankPathForStudioActivity(id: string): string {
  return `/teacher/classes?bank=1&activity=${encodeURIComponent(id)}`;
}
