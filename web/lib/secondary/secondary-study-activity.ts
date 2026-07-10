import { compileSecondaryClozeFromWordIds } from "@/lib/secondary/secondary-cloze-compiler";
import { countSecondaryActivityEligibleWords } from "@/lib/secondary/secondary-practice-types";
import { getSecondarySentenceEligibleWordIds } from "@/lib/secondary/secondary-sentence-word-set";
import type { SecondaryTodayActivityKey, SecondaryTodayCompletion } from "@/lib/secondary/types";

export const SECONDARY_STUDY_ACTIVITY_ORDER: SecondaryTodayActivityKey[] = [
  "match",
  "cloze",
  "spelling",
  "sentence",
];

export const SECONDARY_ACTIVITY_HREF: Record<SecondaryTodayActivityKey, string> = {
  match: "/secondary/match",
  cloze: "/secondary/cloze",
  spelling: "/secondary/spelling",
  sentence: "/secondary/sentence",
};

export type SecondaryStudyActivityContext = {
  sessionWordIds: string[];
  dateKey: string;
  studentId: string;
  completion: SecondaryTodayCompletion;
};

export type SecondaryActivityAvailabilityCounts = {
  match: number;
  cloze: number;
  spelling: number;
  sentence: number;
  hasWordsToday: boolean;
};

export function buildSecondaryActivityAvailabilityCounts(
  ctx: Pick<SecondaryStudyActivityContext, "sessionWordIds" | "dateKey" | "studentId">,
): SecondaryActivityAvailabilityCounts {
  const { sessionWordIds, dateKey, studentId } = ctx;
  const hasWordsToday = sessionWordIds.length > 0;
  const match = hasWordsToday
    ? countSecondaryActivityEligibleWords(sessionWordIds, "match")
    : 0;
  const spelling = hasWordsToday
    ? countSecondaryActivityEligibleWords(sessionWordIds, "spelling")
    : 0;
  const sentence = getSecondarySentenceEligibleWordIds().length;
  const clozeCompiled =
    hasWordsToday && dateKey
      ? compileSecondaryClozeFromWordIds({
          wordItemIds: sessionWordIds,
          studentId,
          dateKey,
        })
      : null;
  const cloze = clozeCompiled?.blankWordItemIds.length ?? 0;

  return { match, cloze, spelling, sentence, hasWordsToday };
}

export function isSecondaryActivityAvailableToday(
  activityKey: SecondaryTodayActivityKey,
  counts: SecondaryActivityAvailabilityCounts,
): boolean {
  if (activityKey === "sentence") return counts.sentence > 0;
  if (!counts.hasWordsToday) return false;
  if (activityKey === "match") return counts.match > 0;
  if (activityKey === "cloze") return counts.cloze > 0;
  if (activityKey === "spelling") return counts.spelling > 0;
  return false;
}

/** First incomplete activity in recommended order, or null if all complete / none available. */
export function resolveSecondaryNextActivityKey(
  ctx: SecondaryStudyActivityContext,
): SecondaryTodayActivityKey | null {
  const counts = buildSecondaryActivityAvailabilityCounts(ctx);

  for (const key of SECONDARY_STUDY_ACTIVITY_ORDER) {
    if (!isSecondaryActivityAvailableToday(key, counts)) continue;
    if (!ctx.completion[key]) return key;
  }

  return null;
}

/** First activity to open for study — incomplete first, then replay first available. */
export function resolveSecondaryStudyActivityKey(
  ctx: SecondaryStudyActivityContext,
): SecondaryTodayActivityKey | null {
  const next = resolveSecondaryNextActivityKey(ctx);
  if (next) return next;

  const counts = buildSecondaryActivityAvailabilityCounts(ctx);
  for (const key of SECONDARY_STUDY_ACTIVITY_ORDER) {
    if (isSecondaryActivityAvailableToday(key, counts)) return key;
  }

  return null;
}

export function resolveSecondaryStudyActivityHref(ctx: SecondaryStudyActivityContext): string {
  const key = resolveSecondaryStudyActivityKey(ctx);
  if (!key) return "/secondary";
  return SECONDARY_ACTIVITY_HREF[key];
}
