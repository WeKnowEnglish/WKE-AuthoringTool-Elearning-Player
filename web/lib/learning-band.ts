/** CEFR bands shown on the level landing page (no pre-A1 yet). */
export const LEARNING_BANDS = ["a1", "a2", "b1"] as const;

export type LearningBand = (typeof LEARNING_BANDS)[number];

export const LEARNING_BAND_COOKIE = "wke-learning-band";

const BAND_SET = new Set<string>(LEARNING_BANDS);

export function isLearningBand(value: string | null | undefined): value is LearningBand {
  return typeof value === "string" && BAND_SET.has(value);
}

export function learningBandLabel(band: LearningBand): string {
  return band.toUpperCase();
}

/** One year — used for client-set preference cookie. */
export const LEARNING_BAND_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
