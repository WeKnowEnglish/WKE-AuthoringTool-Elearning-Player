/**
 * Stored learning-band keys used for student routing / preference.
 * Landing offers Primary (`a1`) and Secondary (`a2`) only.
 * Legacy `b1` remains valid for existing accounts and stays on the primary path.
 */
export const LEARNING_BANDS = ["a1", "a2", "b1"] as const;

export type LearningBand = (typeof LEARNING_BANDS)[number];

/** Tracks shown on the public level landing page. */
export const LANDING_TRACK_BANDS = ["a1", "a2"] as const;

export type LandingTrackBand = (typeof LANDING_TRACK_BANDS)[number];

export const LEARNING_BAND_COOKIE = "wke-learning-band";

const BAND_SET = new Set<string>(LEARNING_BANDS);
const LANDING_TRACK_SET = new Set<string>(LANDING_TRACK_BANDS);

export function isLearningBand(value: string | null | undefined): value is LearningBand {
  return typeof value === "string" && BAND_SET.has(value);
}

export function isLandingTrackBand(value: string | null | undefined): value is LandingTrackBand {
  return typeof value === "string" && LANDING_TRACK_SET.has(value);
}

/** Student-facing track label (Primary / Secondary), not CEFR. */
export function learningBandLabel(band: LearningBand): string {
  if (band === "a1") return "Primary";
  if (band === "a2") return "Secondary";
  return "B1";
}

/** One year — used for client-set preference cookie. */
export const LEARNING_BAND_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
