/** Single source for Interactive Page vs Quiz authoring. */

export const QUIZ_SUBTYPES = [
  "mc_quiz",
  "true_false",
  "short_answer",
  "fill_blanks",
  "fix_text",
  "essay",
  "voice_question",
  "click_targets",
  "hotspot_gate",
  "listen_hotspot_sequence",
  "listen_color_write",
  "letter_mixup",
  "word_shape_hunt",
  "table_complete",
  "sorting_game",
  "drag_match",
  "sound_sort",
  "drag_sentence",
] as const;

export type QuizSubtype = (typeof QUIZ_SUBTYPES)[number];

export const INTERACTION_SUBTYPES = ["hotspot_info", "guided_dialogue"] as const;

export type InteractionSubtypeStandalone = (typeof INTERACTION_SUBTYPES)[number];

const QUIZ_SET = new Set<string>(QUIZ_SUBTYPES);

export function isQuizSubtype(sub: string | null | undefined): sub is QuizSubtype {
  return !!sub && QUIZ_SET.has(sub);
}

export function getQuizGroupIdFromPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const g = (raw as { quiz_group_id?: unknown }).quiz_group_id;
  return typeof g === "string" && g.length > 0 ? g : null;
}

export function getQuizGroupTitleFromPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const t = (raw as { quiz_group_title?: unknown }).quiz_group_title;
  return typeof t === "string" && t.trim().length > 0 ? t.trim() : null;
}

export type StoryboardSegment =
  | { type: "single"; screenIndex: number }
  | {
      type: "quiz";
      groupId: string;
      screenIndices: number[];
      title: string | null;
    };

/** Collapse adjacent screens with the same quiz_group_id into one segment each. */
export function segmentLessonScreensForStoryboard(
  screens: { payload: unknown }[],
): StoryboardSegment[] {
  const segments: StoryboardSegment[] = [];
  let i = 0;
  while (i < screens.length) {
    const gid = getQuizGroupIdFromPayload(screens[i]?.payload);
    if (gid) {
      const screenIndices: number[] = [];
      let title: string | null = null;
      while (i < screens.length && getQuizGroupIdFromPayload(screens[i]?.payload) === gid) {
        screenIndices.push(i);
        if (!title) {
          title = getQuizGroupTitleFromPayload(screens[i]?.payload);
        }
        i += 1;
      }
      segments.push({ type: "quiz", groupId: gid, screenIndices, title });
    } else {
      segments.push({ type: "single", screenIndex: i });
      i += 1;
    }
  }
  return segments;
}

export function findStoryboardSegmentIndexForScreenIndex(
  segments: StoryboardSegment[],
  screenIndex: number,
): number {
  for (let s = 0; s < segments.length; s += 1) {
    const seg = segments[s];
    if (seg.type === "single" && seg.screenIndex === screenIndex) return s;
    if (seg.type === "quiz" && seg.screenIndices.includes(screenIndex)) return s;
  }
  return 0;
}

export type QuizProgressBanner = {
  quiz_group_id: string;
  title: string | null;
  questionIndex: number;
  questionCount: number;
};

export function getQuizProgressForLessonIndex(
  screens: { payload: unknown }[],
  index: number,
): QuizProgressBanner | null {
  if (index < 0 || index >= screens.length) return null;
  const gid = getQuizGroupIdFromPayload(screens[index]?.payload);
  if (!gid) return null;
  let start = index;
  while (start > 0 && getQuizGroupIdFromPayload(screens[start - 1]?.payload) === gid) {
    start -= 1;
  }
  let end = index;
  while (end < screens.length - 1 && getQuizGroupIdFromPayload(screens[end + 1]?.payload) === gid) {
    end += 1;
  }
  const count = end - start + 1;
  const title = getQuizGroupTitleFromPayload(screens[start]?.payload);
  return {
    quiz_group_id: gid,
    title,
    questionIndex: index - start + 1,
    questionCount: count,
  };
}

export const QUIZ_SUBTYPE_LABELS: Record<QuizSubtype, string> = {
  mc_quiz: "Multiple choice",
  true_false: "True / False",
  short_answer: "Short answer",
  fill_blanks: "Fill in the blanks",
  fix_text: "Find and fix",
  essay: "Essay",
  voice_question: "Voice question",
  click_targets: "Click target(s)",
  hotspot_gate: "Hotspots (gate)",
  listen_hotspot_sequence: "Listen + hotspot sequence",
  listen_color_write: "Listen, color, write",
  letter_mixup: "Letter mix-up",
  word_shape_hunt: "Word shape hunt",
  table_complete: "Complete the table",
  sorting_game: "Sorting game",
  drag_match: "Drag match",
  sound_sort: "Sound sort",
  drag_sentence: "Sentence scramble",
};
